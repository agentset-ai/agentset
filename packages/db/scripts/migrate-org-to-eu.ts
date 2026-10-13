// Copies an organization from the US deployment to the EU one, keeping every
// ID so BYO vector stores (keyed by namespace ID) keep working without
// re-ingestion. The US copy is left untouched.
//
// usage (from packages/db):
//   bun --env-file=../../.env.migrate.local scripts/migrate-org-to-eu.ts --org <id>            # dry run
//   bun --env-file=../../.env.migrate.local scripts/migrate-org-to-eu.ts --org <id> --execute  # copy files + rows
//   bun --env-file=../../.env.migrate.local scripts/migrate-org-to-eu.ts --org <id> --stripe   # cutover: tag subscriptions region=eu
//
// --concurrency <n> sets parallel file copies (default 16).
// --skip-managed leaves out namespaces on managed vector stores (they'd need
// re-ingestion) and takes their totals off the organization's counters
//
// env: US_/EU_ DATABASE_URL, S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY,
// S3_BUCKET, IMAGES_S3_BUCKET, ASSETS_S3_BUCKET, ASSETS_S3_URL; STRIPE_API_KEY
// for --stripe
import { parseArgs } from "node:util";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Client } from "pg";
import Stripe from "stripe";

import {
  EU_LLM_MODELS,
  EU_RERANK_MODELS,
  EU_TURBOPUFFER_REGIONS,
} from "@agentset/utils";

import { SUPABASE_ROOT_2021_CA } from "../src/ssl";

type Row = Record<string, unknown>;
type Region = "US" | "EU";

const { values: args } = parseArgs({
  options: {
    org: { type: "string" },
    execute: { type: "boolean", default: false },
    "skip-managed": { type: "boolean", default: false },
    concurrency: { type: "string", default: "16" },
    stripe: { type: "boolean", default: false },
  },
});

const orgId = args.org;
if (!orgId) throw new Error("--org is required");

const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const regionEnv = (region: Region, name: string) =>
  requireEnv(`${region}_${name}`);

// ===============================================
// Clients
// ===============================================

const connectDb = async (region: Region) => {
  const connectionString = regionEnv(region, "DATABASE_URL");
  const { hostname } = new URL(connectionString);
  const client = new Client({
    connectionString,
    ssl:
      region === "EU" &&
      [".supabase.com", ".supabase.co"].some((s) => hostname.endsWith(s))
        ? { ca: SUPABASE_ROOT_2021_CA }
        : undefined,
  });
  await client.connect();
  return client;
};

const createStorage = (region: Region) => ({
  client: new S3Client({
    region: "auto",
    endpoint: regionEnv(region, "S3_ENDPOINT"),
    credentials: {
      accessKeyId: regionEnv(region, "S3_ACCESS_KEY"),
      secretAccessKey: regionEnv(region, "S3_SECRET_KEY"),
    },
  }),
  bucket: regionEnv(region, "S3_BUCKET"),
  imagesBucket: regionEnv(region, "IMAGES_S3_BUCKET"),
  assetsBucket: regionEnv(region, "ASSETS_S3_BUCKET"),
  assetsUrl: regionEnv(region, "ASSETS_S3_URL"),
});

// ===============================================
// Stripe cutover
// ===============================================

const tagStripeSubscriptions = async (us: Client) => {
  const { rows } = await us.query<{ stripeId: string | null }>(
    `SELECT "stripeId" FROM "organization" WHERE id = $1`,
    [orgId],
  );
  const customer = rows[0]?.stripeId;
  if (!customer) throw new Error("Organization has no Stripe customer");

  const stripe = new Stripe(requireEnv("STRIPE_API_KEY"));
  const subscriptions = await stripe.subscriptions.list({
    customer,
    status: "all",
  });
  for (const subscription of subscriptions.data) {
    await stripe.subscriptions.update(subscription.id, {
      metadata: { ...subscription.metadata, region: "eu" },
    });
    console.log(
      `Tagged subscription ${subscription.id} (${subscription.status}) region=eu`,
    );
  }
};

// ===============================================
// Read the US organization
// ===============================================

const DONE_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"];

// no config falls back to the managed store
const usesManagedVectorStore = (ns: Row) => {
  const provider = (ns.vectorStoreConfig as { provider?: string } | null)
    ?.provider;
  return !provider || provider.startsWith("MANAGED_");
};

const sumOf = (rows: Row[], key: string) =>
  rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);

const loadOrganization = async (us: Client) => {
  const select = async (sql: string, params: unknown[]) =>
    (await us.query<Row>(sql, params)).rows;

  const [usOrganization] = await select(
    `SELECT * FROM "organization" WHERE id = $1`,
    [orgId],
  );
  if (!usOrganization) {
    throw new Error(`Organization ${orgId} not found in US`);
  }

  const members = await select(
    `SELECT * FROM "member" WHERE "organizationId" = $1`,
    [orgId],
  );
  const userIds = members.map((m) => m.userId);
  const users = await select(`SELECT * FROM "user" WHERE id = ANY($1)`, [
    userIds,
  ]);
  const accounts = await select(
    `SELECT * FROM "account" WHERE "userId" = ANY($1)`,
    [userIds],
  );

  const allNamespaces = await select(
    `SELECT * FROM "namespace" WHERE "organizationId" = $1`,
    [orgId],
  );
  const skippedNamespaces = args["skip-managed"]
    ? allNamespaces.filter(usesManagedVectorStore)
    : [];
  const namespaces = allNamespaces.filter(
    (ns) => !skippedNamespaces.includes(ns),
  );

  const counter = (key: string, removed: number) =>
    Math.max(0, Number(usOrganization[key] ?? 0) - removed);
  const organization: Row = {
    ...usOrganization,
    totalNamespaces: counter("totalNamespaces", skippedNamespaces.length),
    totalDocuments: counter(
      "totalDocuments",
      sumOf(skippedNamespaces, "totalDocuments"),
    ),
    totalIngestJobs: counter(
      "totalIngestJobs",
      sumOf(skippedNamespaces, "totalIngestJobs"),
    ),
    totalPages: counter("totalPages", sumOf(skippedNamespaces, "totalPages")),
  };

  const namespaceIds = namespaces.map((n) => n.id);
  const byNamespace = (table: string) =>
    select(`SELECT * FROM "${table}" WHERE "namespaceId" = ANY($1)`, [
      namespaceIds,
    ]);

  return {
    organization,
    skippedNamespaces,
    members,
    users,
    accounts,
    namespaces,
    hostings: await byNamespace("Hosting"),
    connections: await byNamespace("connection"),
    ingestJobs: await byNamespace("ingest_job"),
    documents: await byNamespace("document"),
    webhooks: await select(
      `SELECT * FROM "Webhook" WHERE "organizationId" = $1`,
      [orgId],
    ),
    namespaceWebhooks: await byNamespace("NamespaceWebhook"),
    domains: await select(
      `SELECT d.* FROM "Domain" d JOIN "Hosting" h ON h.id = d."hostingId" WHERE h."namespaceId" = ANY($1)`,
      [namespaceIds],
    ),
  };
};

type OrgData = Awaited<ReturnType<typeof loadOrganization>>;

// ===============================================
// Checks
// ===============================================

const getIssues = async (data: OrgData, eu: Client) => {
  const issues: string[] = [];

  if (data.organization.status !== "ACTIVE") {
    issues.push(`organization status is ${data.organization.status}`);
  }

  for (const ns of data.namespaces) {
    const embedding = ns.embeddingConfig as { provider?: string } | null;
    // no config falls back to the managed model
    if (embedding && embedding.provider !== "MANAGED_OPENAI") {
      issues.push(
        `namespace ${ns.id}: embedding provider ${embedding.provider} isn't available on EU`,
      );
    }

    const vectorStore = ns.vectorStoreConfig as {
      provider?: string;
      region?: string;
    } | null;
    if (usesManagedVectorStore(ns)) {
      issues.push(
        `namespace ${ns.id}: uses a managed vector store (${vectorStore?.provider ?? "default"}), needs re-ingestion (or pass --skip-managed to leave it out)`,
      );
    } else if (
      vectorStore?.provider === "TURBOPUFFER" &&
      !(EU_TURBOPUFFER_REGIONS as readonly string[]).includes(
        vectorStore?.region ?? "",
      )
    ) {
      issues.push(
        `namespace ${ns.id}: Turbopuffer region ${vectorStore?.region} isn't allowed on EU`,
      );
    }
  }

  for (const hosting of data.hostings) {
    const llm = (hosting.llmConfig as { model?: string } | null)?.model;
    if (llm && !(EU_LLM_MODELS as readonly string[]).includes(llm)) {
      issues.push(`hosting ${hosting.id}: LLM ${llm} isn't available on EU`);
    }
    const rerank = (hosting.rerankConfig as { model?: string } | null)?.model;
    if (rerank && !(EU_RERANK_MODELS as readonly string[]).includes(rerank)) {
      issues.push(
        `hosting ${hosting.id}: reranker ${rerank} isn't available on EU`,
      );
    }
  }

  const inFlight = [...data.ingestJobs, ...data.documents].filter(
    (r) => !DONE_STATUSES.includes(r.status as string),
  );
  if (inFlight.length > 0) {
    issues.push(
      `${inFlight.length} ingest jobs/documents are still in progress: ${inFlight
        .slice(0, 5)
        .map((r) => `${r.id} (${r.status})`)
        .join(", ")}`,
    );
  }

  // conflicts in the EU database
  const exists = async (sql: string, params: unknown[]) =>
    ((await eu.query(sql, params)).rowCount ?? 0) > 0;

  if (
    await exists(`SELECT 1 FROM "organization" WHERE id = $1 OR slug = $2`, [
      orgId,
      data.organization.slug,
    ])
  ) {
    issues.push(
      `EU already has an organization with this id or slug (${data.organization.slug as string})`,
    );
  }
  if (
    await exists(`SELECT 1 FROM "namespace" WHERE id = ANY($1)`, [
      data.namespaces.map((n) => n.id),
    ])
  ) {
    issues.push("EU already has some of these namespace ids");
  }
  const hostingSlugs = data.hostings.map((h) => h.slug).filter(Boolean);
  if (
    await exists(`SELECT 1 FROM "Hosting" WHERE slug = ANY($1)`, [hostingSlugs])
  ) {
    issues.push("EU already has some of these hosting slugs");
  }

  return issues;
};

// ===============================================
// Files
// ===============================================

type Storage = ReturnType<typeof createStorage>;

type CopyTask = {
  fromBucket: string;
  toBucket: string;
  key: string;
  size: number;
};

const formatBytes = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};

const formatDuration = (ms: number) => {
  const seconds = Math.round(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h${m}m` : m > 0 ? `${m}m${s}s` : `${s}s`;
};

/** One status line: overwritten in place on a terminal, logged every 10s otherwise. */
const createProgress = (label: string, totalItems: number, totalBytes = 0) => {
  const startedAt = Date.now();
  let items = 0;
  let bytes = 0;

  const line = () => {
    const elapsed = Date.now() - startedAt;
    // ETA by bytes when sizes are known, otherwise by item count
    const fraction =
      totalBytes > 0
        ? bytes / totalBytes
        : totalItems > 0
          ? items / totalItems
          : 1;
    const eta =
      fraction > 0 && fraction < 1
        ? formatDuration(elapsed / fraction - elapsed)
        : "-";
    const rate = elapsed > 0 ? (items / elapsed) * 1000 : 0;
    return [
      `${label}: ${items}/${totalItems} (${Math.floor(fraction * 100)}%)`,
      totalBytes > 0 ? `${formatBytes(bytes)}/${formatBytes(totalBytes)}` : "",
      `${rate.toFixed(1)}/s`,
      `elapsed ${formatDuration(elapsed)}`,
      `ETA ${eta}`,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const isTty = process.stdout.isTTY;
  const render = () =>
    isTty ? process.stdout.write(`\r\x1b[K${line()}`) : console.log(line());
  const timer = setInterval(render, isTty ? 500 : 10_000);

  return {
    tick(size = 0) {
      items++;
      bytes += size;
    },
    done() {
      clearInterval(timer);
      if (isTty) process.stdout.write(`\r\x1b[K`);
      console.log(line());
    },
  };
};

const runPool = async <T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) => {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        await worker(items[next++]!);
      }
    }),
  );
};

const listObjects = async (
  storage: Storage,
  bucket: string,
  prefix: string,
) => {
  const objects = new Map<string, number>();
  let token: string | undefined;
  do {
    const page = await storage.client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    for (const object of page.Contents ?? []) {
      objects.set(object.Key!, object.Size ?? 0);
    }
    token = page.NextContinuationToken;
  } while (token);
  return objects;
};

const copyObject = async (from: Storage, to: Storage, task: CopyTask) => {
  const object = await from.client.send(
    new GetObjectCommand({ Bucket: task.fromBucket, Key: task.key }),
  );
  await to.client.send(
    new PutObjectCommand({
      Bucket: task.toBucket,
      Key: task.key,
      Body: await object.Body!.transformToByteArray(),
      ContentType: object.ContentType,
      CacheControl: object.CacheControl,
    }),
  );
};

/** Objects to copy, minus those already on EU with the same size (reruns). */
const getCopyTasks = async (data: OrgData, us: Storage, eu: Storage) => {
  const sources: { fromBucket: string; toBucket: string; prefix: string }[] =
    [];
  for (const ns of data.namespaces) {
    const prefix = `namespaces/${ns.id as string}/`;
    // uploads and chunk files
    sources.push({ fromBucket: us.bucket, toBucket: eu.bucket, prefix });
    // images extracted by the partitioner
    sources.push({
      fromBucket: us.imagesBucket,
      toBucket: eu.imagesBucket,
      prefix,
    });
  }
  for (const hosting of data.hostings) {
    for (const field of ["logo", "ogImage"] as const) {
      const url = hosting[field] as string | null;
      if (!url?.startsWith(`${us.assetsUrl}/`)) continue;
      sources.push({
        fromBucket: us.assetsBucket,
        toBucket: eu.assetsBucket,
        prefix: url.slice(us.assetsUrl.length + 1),
      });
    }
  }

  const tasks: CopyTask[] = [];
  let skipped = 0;
  const listing = createProgress("Listing", sources.length);
  await runPool(sources, 8, async (source) => {
    const [existing, wanted] = await Promise.all([
      listObjects(eu, source.toBucket, source.prefix),
      listObjects(us, source.fromBucket, source.prefix),
    ]);
    for (const [key, size] of wanted) {
      if (existing.get(key) === size) {
        skipped++;
      } else {
        tasks.push({ ...source, key, size });
      }
    }
    listing.tick();
  });
  listing.done();

  return { tasks, skipped };
};

const copyFiles = async (
  data: OrgData,
  us: Storage,
  eu: Storage,
  concurrency: number,
) => {
  const { tasks, skipped } = await getCopyTasks(data, us, eu);
  const totalBytes = tasks.reduce((sum, t) => sum + t.size, 0);
  console.log(
    `Files: ${tasks.length} to copy (${formatBytes(totalBytes)}), ${skipped} already on EU`,
  );

  const progress = createProgress("Copying files", tasks.length, totalBytes);
  await runPool(tasks, concurrency, async (task) => {
    await copyObject(us, eu, task);
    progress.tick(task.size);
  });
  progress.done();
};

// uploaded files stored outside the namespace prefix wouldn't be copied
const getSourcesOutsidePrefix = (data: OrgData) =>
  data.documents.filter((doc) => {
    const source = doc.source as { type?: string; key?: string };
    return (
      source.type === "MANAGED_FILE" &&
      !source.key?.startsWith(`namespaces/${doc.namespaceId as string}/`)
    );
  });

// ===============================================
// Rows
// ===============================================

// postgres allows 65535 parameters per statement
const MAX_QUERY_PARAMS = 60_000;

const insertRows = async (eu: Client, table: string, rows: Row[]) => {
  if (rows.length === 0) return;

  // pg would send JS arrays in json columns as postgres arrays
  const { rows: jsonColumns } = await eu.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND data_type IN ('json', 'jsonb')`,
    [table],
  );
  const isJson = new Set(jsonColumns.map((c) => c.column_name));

  // rows of a table share their columns (SELECT *)
  const columns = Object.keys(rows[0]!);
  const batchSize = Math.max(1, Math.floor(MAX_QUERY_PARAMS / columns.length));
  const progress = createProgress(table, rows.length);

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch.flatMap((row) =>
      columns.map((c) =>
        isJson.has(c) && row[c] !== null ? JSON.stringify(row[c]) : row[c],
      ),
    );
    const placeholders = batch
      .map(
        (_, r) =>
          `(${columns.map((_, c) => `$${r * columns.length + c + 1}`).join(", ")})`,
      )
      .join(", ");
    await eu.query(
      `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES ${placeholders}`,
      values,
    );
    for (const _ of batch) progress.tick();
  }
  progress.done();
};

const copyRows = async (
  data: OrgData,
  eu: Client,
  usStorage: Storage,
  euStorage: Storage,
) => {
  // members who already have an EU account keep it
  const { rows: existingUsers } = await eu.query<{ id: string; email: string }>(
    `SELECT id, email FROM "user" WHERE email = ANY($1)`,
    [data.users.map((u) => u.email)],
  );
  const euUserIdByEmail = new Map(existingUsers.map((u) => [u.email, u.id]));
  const newUsers = data.users.filter(
    (u) => !euUserIdByEmail.has(u.email as string),
  );
  const newUserIds = new Set(newUsers.map((u) => u.id));
  const userIdMap = new Map(
    data.users.map((u) => [
      u.id,
      euUserIdByEmail.get(u.email as string) ?? u.id,
    ]),
  );

  const toEuAssetUrl = (url: unknown) =>
    typeof url === "string" && url.startsWith(`${usStorage.assetsUrl}/`)
      ? `${euStorage.assetsUrl}/${url.slice(usStorage.assetsUrl.length + 1)}`
      : url;

  await eu.query("BEGIN");
  try {
    await insertRows(eu, "user", newUsers);
    await insertRows(
      eu,
      "account",
      data.accounts.filter((a) => newUserIds.has(a.userId)),
    );
    await insertRows(eu, "organization", [data.organization]);
    await insertRows(
      eu,
      "member",
      data.members.map((m) => ({ ...m, userId: userIdMap.get(m.userId) })),
    );
    await insertRows(eu, "namespace", data.namespaces);
    await insertRows(
      eu,
      "Hosting",
      data.hostings.map((h) => ({
        ...h,
        logo: toEuAssetUrl(h.logo),
        ogImage: toEuAssetUrl(h.ogImage),
      })),
    );
    await insertRows(eu, "connection", data.connections);
    await insertRows(eu, "ingest_job", data.ingestJobs);
    await insertRows(eu, "document", data.documents);
    await insertRows(eu, "Webhook", data.webhooks);
    await insertRows(eu, "NamespaceWebhook", data.namespaceWebhooks);
    await eu.query("COMMIT");
  } catch (error) {
    await eu.query("ROLLBACK");
    throw error;
  }

  console.log(
    `users: ${newUsers.length} created, ${existingUsers.length} already on EU`,
  );
};

// ===============================================
// Main
// ===============================================

const main = async () => {
  const us = await connectDb("US");
  try {
    if (args.stripe) {
      await tagStripeSubscriptions(us);
      return;
    }

    const eu = await connectDb("EU");
    try {
      const data = await loadOrganization(us);

      console.log(
        `Organization ${data.organization.name as string} (${data.organization.slug as string}, plan ${data.organization.plan as string})`,
      );
      console.log(
        [
          `members ${data.members.length}`,
          `namespaces ${data.namespaces.length}`,
          `hostings ${data.hostings.length}`,
          `connections ${data.connections.length}`,
          `ingest jobs ${data.ingestJobs.length}`,
          `documents ${data.documents.length}`,
          `webhooks ${data.webhooks.length}`,
        ].join(", "),
      );
      for (const ns of data.namespaces) {
        const vectorStore = ns.vectorStoreConfig as {
          provider?: string;
        } | null;
        console.log(
          `  namespace ${ns.id} (${ns.slug as string}): ${vectorStore?.provider ?? "default"}`,
        );
      }
      for (const ns of data.skippedNamespaces) {
        console.log(
          `  skipped namespace ${ns.id} (${ns.slug as string}): managed vector store, ${Number(ns.totalDocuments)} documents`,
        );
      }
      if (data.domains.length > 0) {
        console.log(
          `Custom domains aren't copied, re-add them on EU: ${data.domains.map((d) => d.slug).join(", ")}`,
        );
      }

      const outside = getSourcesOutsidePrefix(data);
      if (outside.length > 0) {
        console.log(
          `Warning: ${outside.length} uploaded files are outside their namespace prefix and won't be copied`,
        );
      }

      const issues = await getIssues(data, eu);
      if (issues.length > 0) {
        console.error(
          `\nCan't migrate:\n${issues.map((i) => `  - ${i}`).join("\n")}`,
        );
        process.exitCode = 1;
        return;
      }

      if (!args.execute) {
        console.log("\nChecks passed. Dry run: rerun with --execute to copy.");
        return;
      }

      const usStorage = createStorage("US");
      const euStorage = createStorage("EU");

      // files first, so EU rows never point at missing files
      await copyFiles(data, usStorage, euStorage, Number(args.concurrency));
      await copyRows(data, eu, usStorage, euStorage);

      console.log("\nDone. The US copy is unchanged.");
    } finally {
      await eu.end();
    }
  } finally {
    await us.end();
  }
};

await main();
