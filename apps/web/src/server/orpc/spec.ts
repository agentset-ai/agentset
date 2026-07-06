import { errorSchemaFactory } from "@/lib/api/errors";
import { ApiKeySchema, CreatedApiKeySchema } from "@/schemas/api/api-key";
import { chatMessageSchema, chatResponseSchema } from "@/schemas/api/chat";
import { DocumentSchema } from "@/schemas/api/document";
import {
  DomainSchema,
  DomainStatusSchema,
  HostingSchema,
} from "@/schemas/api/hosting";
import { IngestJobSchema } from "@/schemas/api/ingest-job";
import { NamespaceSchema } from "@/schemas/api/namespace";
import { NodeSchema } from "@/schemas/api/node";
import {
  OrganizationInvitationSchema,
  OrganizationMemberSchema,
  OrganizationMembersSchema,
  OrganizationSchema,
} from "@/schemas/api/organization";
import { paginationSchema } from "@/schemas/api/pagination";
import { uploadFileSchema, UploadResultSchema } from "@/schemas/api/upload";
import {
  WebhookDetailsSchema,
  WebhookSchema,
  WebhookSummarySchema,
} from "@/schemas/api/webhook";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { z } from "zod/v4";

import { DocumentStatusSchema, IngestJobStatusSchema } from "@agentset/db";
import {
  AzureEmbeddingConfigSchema,
  batchPayloadInputSchema,
  batchPayloadSchema,
  configSchema,
  crawlPayloadSchema,
  createVectorStoreSchema,
  documentConfigSchema,
  EmbeddingConfigSchema,
  filePayloadSchema,
  GoogleEmbeddingConfigSchema,
  googleEmbeddingModelEnum,
  ingestJobPayloadInputSchema,
  ingestJobPayloadSchema,
  languageCode,
  managedFilePayloadSchema,
  OpenAIEmbeddingConfigSchema,
  openaiEmbeddingModelEnum,
  PineconeVectorStoreConfigSchema,
  textPayloadInputSchema,
  textPayloadSchema,
  TurbopufferVectorStoreConfigSchema,
  VectorStoreSchema,
  VoyageEmbeddingConfigSchema,
  voyageEmbeddingModelEnum,
  youtubePayloadSchema,
} from "@agentset/validation";
import { webhookEventSchema } from "@agentset/webhooks";

import { successSchema } from "./base";
import { appRouter } from "./router";

/**
 * Builds the public OpenAPI document (`/openapi.json`) from the app router,
 * then post-processes it into byte-level parity with the legacy
 * zod-openapi document. Speakeasy (SDK generation) and Mintlify (docs) ingest
 * this document, so operationIds, `x-speakeasy-*` extensions, component
 * schema NAMES and the shared error/parameter components must not drift.
 */

/* -------------------------------------------------------------------------
 * Top-level document metadata — copied verbatim from the legacy
 * `src/openapi/index.ts`.
 * ---------------------------------------------------------------------- */

const INFO = {
  title: "AgentsetAPI",
  description: "Agentset is agentic rag-as-a-service",
  version: "0.0.1",
  contact: {
    name: "Agentset Support",
    email: "support@agentset.ai",
    url: "https://api.agentset.ai/",
  },
  license: {
    name: "MIT License",
    url: "https://github.com/agentset-ai/agentset/blob/main/LICENSE.md",
  },
};

const SERVERS = [
  {
    url: "https://api.agentset.ai",
    description: "Production API",
  },
];

const SPEAKEASY_GLOBALS = {
  parameters: [
    { $ref: "#/components/parameters/NamespaceIdRef" },
    { $ref: "#/components/parameters/TenantIdRef" },
  ],
};

const SECURITY_SCHEMES = {
  token: {
    type: "http",
    description: "Default authentication mechanism",
    scheme: "bearer",
    "x-speakeasy-example": "AGENTSET_API_KEY",
  },
};

/**
 * Shared parameter components. The legacy document emitted these from
 * zod-openapi `param.id` metas; they are constants now, and every operation's
 * inline path/header parameters are swapped for `$ref`s below.
 */
const PARAMETER_COMPONENTS = {
  NamespaceIdRef: {
    in: "path",
    name: "namespaceId",
    schema: {
      type: "string",
      examples: ["ns_123"],
      description: "The id of the namespace (prefixed with ns_)",
    },
    "x-speakeasy-globals-hidden": true,
    required: true,
    description: "The id of the namespace (prefixed with ns_)",
  },
  TenantIdRef: {
    in: "header",
    name: "x-tenant-id",
    schema: {
      description:
        "Optional tenant id to use for the request. If not provided, the namespace will be used directly. Must be alphanumeric and up to 64 characters.",
      type: "string",
      pattern: "^[A-Za-z0-9]{1,64}$",
    },
    description:
      "Optional tenant id to use for the request. If not provided, the namespace will be used directly. Must be alphanumeric and up to 64 characters.",
  },
  JobIdRef: {
    in: "path",
    name: "jobId",
    schema: {
      type: "string",
      examples: ["job_123"],
      description: "The id of the job (prefixed with job_)",
    },
    required: true,
    description: "The id of the job (prefixed with job_)",
  },
  DocumentIdRef: {
    in: "path",
    name: "documentId",
    schema: {
      type: "string",
      examples: ["doc_123"],
      description: "The id of the document (prefixed with doc_)",
    },
    required: true,
    description: "The id of the document (prefixed with doc_)",
  },
  WebhookIdRef: {
    in: "path",
    name: "webhookId",
    schema: {
      type: "string",
      examples: ["wh_123"],
      description: "The id of the webhook (prefixed with wh_)",
    },
    required: true,
    description: "The id of the webhook (prefixed with wh_)",
  },
  ApiKeyIdRef: {
    in: "path",
    name: "keyId",
    schema: {
      type: "string",
      examples: ["cm4x1q2z90000abcd1234efgh"],
      description: "The id of the API key.",
    },
    required: true,
    description: "The id of the API key.",
  },
};

/** Path-parameter name → shared parameter component. */
const PATH_PARAM_COMPONENTS: Record<string, string> = {
  namespaceId: "NamespaceIdRef",
  documentId: "DocumentIdRef",
  jobId: "JobIdRef",
  webhookId: "WebhookIdRef",
  keyId: "ApiKeyIdRef",
};

/** Operations that accept the `x-tenant-id` header (matches the old spec). */
const TENANT_HEADER_OPERATIONS = new Set([
  "listIngestJobs",
  "createIngestJob",
  "getIngestJobInfo",
  "deleteIngestJob",
  "reIngestJob",
  "listDocuments",
  "getDocument",
  "deleteDocument",
  "search",
  "chat",
  "warmUp",
]);

/* -------------------------------------------------------------------------
 * Shared error responses (`components.responses`), $ref'd from every
 * operation. Descriptions copied verbatim from the legacy zod-openapi
 * responses module; the zod-openapi-specific `id` is dropped — the component
 * key is the status string.
 * ---------------------------------------------------------------------- */

const ERROR_RESPONSE_DESCRIPTIONS = {
  bad_request:
    "The server cannot or will not process the request due to something that is perceived to be a client error (e.g., malformed request syntax, invalid request message framing, or deceptive request routing).",
  unauthorized: `Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated". That is, the client must authenticate itself to get the requested response.`,
  forbidden:
    "The client does not have access rights to the content; that is, it is unauthorized, so the server is refusing to give the requested resource. Unlike 401 Unauthorized, the client's identity is known to the server.",
  not_found: "The server cannot find the requested resource.",
  conflict:
    "This response is sent when a request conflicts with the current state of the server.",
  invite_expired:
    "This response is sent when the requested content has been permanently deleted from server, with no forwarding address.",
  unprocessable_entity:
    "The request was well-formed but was unable to be followed due to semantic errors.",
  rate_limit_exceeded: `The user has sent too many requests in a given amount of time ("rate limiting")`,
  internal_server_error:
    "The server has encountered a situation it does not know how to handle.",
} as const;

const ERROR_RESPONSE_COMPONENTS = Object.fromEntries(
  Object.entries(ERROR_RESPONSE_DESCRIPTIONS).map(([code, description]) => {
    const { id, ...response } = errorSchemaFactory(
      code as keyof typeof ERROR_RESPONSE_DESCRIPTIONS,
      description,
    );
    return [id, response];
  }),
);

const ERROR_RESPONSE_REFS = Object.fromEntries(
  Object.keys(ERROR_RESPONSE_COMPONENTS).map((status) => [
    status,
    { $ref: `#/components/responses/${status}` },
  ]),
);

/* -------------------------------------------------------------------------
 * Success-response descriptions per operation (the raw generator emits
 * "OK"). Copied verbatim from the legacy per-operation spec files.
 * ---------------------------------------------------------------------- */

const SUCCESS_DESCRIPTIONS: Record<string, string> = {
  listNamespaces: "The retrieved namespaces",
  createNamespace: "The created namespace",
  getNamespace: "The retrieved namespace",
  updateNamespace: "The updated namespace",
  deleteNamespace: "The namespace was queued for deletion.",
  listIngestJobs: "The retrieved ingest jobs",
  createIngestJob: "The created ingest job",
  getIngestJobInfo: "The retrieved ingest job",
  deleteIngestJob: "The deleted ingest job",
  reIngestJob: "The re-ingested job",
  // NOTE: the "ingest job" wording on the two document operations is a legacy
  // copy/paste quirk — kept verbatim for parity.
  listDocuments: "The retrieved ingest jobs",
  getDocument: "The retrieved ingest job",
  deleteDocument: "The deleted document",
  getChunksDownloadUrl: "The presigned download URL for the chunks",
  getFileDownloadUrl: "The presigned download URL for the file",
  search: "The retrieved namespace",
  chat: "The generated answer and the sources used to generate it",
  warmUp: "Cache warming started",
  createUpload: "Presigned URL generated successfully",
  createBatchUpload: "Presigned URLs generated successfully",
  getHosting: "The hosting configuration",
  enableHosting: "The created hosting configuration",
  updateHosting: "The updated hosting configuration",
  deleteHosting: "The hosting configuration was deleted",
  checkDomainStatus: "The domain status",
  addDomain: "The added domain",
  removeDomain: "The domain was removed",
  listWebhooks: "The retrieved webhooks",
  createWebhook: "The created webhook",
  getWebhook: "The retrieved webhook",
  updateWebhook: "The updated webhook",
  deleteWebhook: "The webhook was deleted",
  regenerateWebhookSecret: "The webhook with its new secret",
  getOrganization: "The retrieved organization",
  updateOrganization: "The updated organization",
  listOrganizationMembers: "The retrieved members and pending invitations",
  listApiKeys: "The retrieved API keys",
  createApiKey: "The created API key",
  deleteApiKey: "The API key was deleted",
};

/**
 * Soft deletes respond 200 on the wire but the legacy spec documented them
 * under "204" — Speakeasy consumed that shape, so the key is renamed.
 */
const SOFT_DELETE_STATUS_RENAMES: Record<string, [from: string, to: string]> = {
  deleteDocument: ["200", "204"],
  deleteIngestJob: ["200", "204"],
};

/**
 * Hard deletes return an empty 204; the legacy spec documented them with a
 * bare description (no content). The generator emits a `z.void()` body stub.
 */
const EMPTY_204_OPERATIONS = new Set([
  "deleteNamespace",
  "deleteHosting",
  "removeDomain",
  "deleteWebhook",
  "deleteApiKey",
]);

/**
 * Request bodies that were published as a top-level component `$ref`. The
 * oRPC input schema is extended with `namespaceId`, so identity-based
 * hoisting can't reproduce the root ref — swapped here instead.
 */
const REQUEST_BODY_COMPONENT_REFS: Record<string, string> = {
  createUpload: "upload-file-schema",
};

/**
 * zod-openapi hoisted the `pagination-per-page` component from the schema
 * before `.min().max()` were applied, leaving the numeric bounds (and type/
 * description) as `$ref` siblings at each parameter site. Reproduced
 * verbatim so the published parameter shape doesn't move.
 */
const PER_PAGE_REF = "#/components/schemas/pagination-per-page";
const PER_PAGE_PARAM_SIBLINGS = {
  type: "number",
  minimum: 1,
  maximum: 100,
  description: "The number of records to return per page.",
};

/* -------------------------------------------------------------------------
 * components.schemas — recreate the legacy component names by registering
 * the same zod schemas the legacy spec tagged with `.meta({ id })`.
 * ---------------------------------------------------------------------- */

/** Unwraps optional/default/nullable wrappers to the meta-carrying schema. */
const unwrapField = (schema: z.ZodType): z.ZodType => {
  let current = schema;
  for (;;) {
    const def = (
      current as unknown as { def: { type: string; innerType?: z.ZodType } }
    ).def;
    if (
      def.innerType &&
      (def.type === "optional" ||
        def.type === "default" ||
        def.type === "nullable")
    ) {
      current = def.innerType;
      continue;
    }
    return current;
  }
};

const modeSchema = unwrapField(configSchema.shape.mode);
const paginationCursorSchema = unwrapField(paginationSchema.shape.cursor);
const paginationCursorDirectionSchema = unwrapField(
  paginationSchema.shape.cursorDirection,
);
const paginationPerPageSchema = unwrapField(paginationSchema.shape.perPage);

const [documentWebhookEventSchema, ingestJobWebhookEventSchema] =
  webhookEventSchema.def.options as unknown as [z.ZodType, z.ZodType];

/**
 * Schemas whose legacy spec had distinct input ("X") and output ("XOutput")
 * component variants (zod-openapi emitted both because its output conversion
 * added `additionalProperties: false`). The same zod object backs both names:
 * "X" is registered for the input strategy and a lightweight clone (same
 * conversion output, distinct identity) is registered as "XOutput" for the
 * output strategy; a converter interceptor routes output-context usages to
 * the clone so responses keep referencing "XOutput".
 */
const IO_PAIR_SCHEMAS: Record<string, z.ZodType> = {
  "document-config": documentConfigSchema,
  "ingest-job-config": configSchema,
  "embedding-model-config": EmbeddingConfigSchema,
  "openai-embedding-config": OpenAIEmbeddingConfigSchema,
  "azure-embedding-config": AzureEmbeddingConfigSchema,
  "google-embedding-config": GoogleEmbeddingConfigSchema,
  "voyage-embedding-config": VoyageEmbeddingConfigSchema,
  "pinecone-config": PineconeVectorStoreConfigSchema,
  "turbopuffer-config": TurbopufferVectorStoreConfigSchema,
  "file-payload": filePayloadSchema,
  "managed-file-payload": managedFilePayloadSchema,
  "crawl-payload": crawlPayloadSchema,
  "youtube-payload": youtubePayloadSchema,
};

/** canonical schema → its "XOutput" clone (see IO_PAIR_SCHEMAS). */
const outputVariants = new Map<z.ZodType, { name: string; clone: z.ZodType }>(
  Object.entries(IO_PAIR_SCHEMAS).map(([name, schema]) => [
    schema,
    {
      name: `${name}Output`,
      clone: schema.meta({ ...z.globalRegistry.get(schema) }),
    },
  ]),
);

/**
 * Canonical enum schemas that also appear in the conversion tree as
 * `.describe()` clones (the clone is a different object, so identity
 * matching misses it, but it shares the canonical's `def.entries` object).
 * The interceptor redirects clones to the canonical object and keeps the
 * site-specific description as a `$ref` sibling — exactly what zod-openapi
 * produced.
 */
const ENUM_CLONE_CANONICALS = [
  languageCode,
  DocumentStatusSchema,
  IngestJobStatusSchema,
];

const zodDef = (schema: unknown) =>
  (
    schema as {
      _zod: {
        def: {
          type: string;
          entries?: unknown;
          discriminator?: string;
          options?: unknown[];
          out?: unknown;
          shape?: Record<string, unknown>;
          values?: unknown[];
        };
      };
    }
  )._zod.def;

const enumCanonicalsByEntries = new Map(
  ENUM_CLONE_CANONICALS.map((schema) => [zodDef(schema).entries, schema]),
);

type CommonSchemaEntry = { schema: z.ZodType; strategy?: "input" | "output" };

const commonSchemas: Record<string, CommonSchemaEntry> = {
  // ---- input-context components (request bodies / query parameters) ----
  "chat-message": { schema: chatMessageSchema },
  "create-vector-store-config": { schema: createVectorStoreSchema },
  "upload-file-schema": { schema: uploadFileSchema },
  "ingest-job-payload-input": { schema: ingestJobPayloadInputSchema },
  "batch-payload-input": { schema: batchPayloadInputSchema },
  "text-payload-input": { schema: textPayloadInputSchema },
  "pagination-cursor": { schema: paginationCursorSchema },
  "pagination-cursor-direction": { schema: paginationCursorDirectionSchema },
  "pagination-per-page": { schema: paginationPerPageSchema },

  // ---- shared enums (input/output conversions are identical) ----
  "document-status": { schema: DocumentStatusSchema },
  "ingest-job-status": { schema: IngestJobStatusSchema },
  "language-code": { schema: languageCode },
  mode: { schema: modeSchema },
  "openai-embedding-model-enum": { schema: openaiEmbeddingModelEnum },
  "google-embedding-model-enum": { schema: googleEmbeddingModelEnum },
  "voyage-embedding-model-enum": { schema: voyageEmbeddingModelEnum },
  // regionEnum is not re-exported from the validation barrel; the shape field
  // is the same object.
  "turbopuffer-region-enum": {
    schema: TurbopufferVectorStoreConfigSchema.shape.region,
  },

  // ---- output-context components (responses) ----
  "api-key": { schema: ApiKeySchema, strategy: "output" },
  "created-api-key": { schema: CreatedApiKeySchema, strategy: "output" },
  "chat-response": { schema: chatResponseSchema, strategy: "output" },
  document: { schema: DocumentSchema, strategy: "output" },
  domain: { schema: DomainSchema, strategy: "output" },
  "domain-status": { schema: DomainStatusSchema, strategy: "output" },
  hosting: { schema: HostingSchema, strategy: "output" },
  "ingest-job": { schema: IngestJobSchema, strategy: "output" },
  namespace: { schema: NamespaceSchema, strategy: "output" },
  organization: { schema: OrganizationSchema, strategy: "output" },
  "organization-member": {
    schema: OrganizationMemberSchema,
    strategy: "output",
  },
  "organization-invitation": {
    schema: OrganizationInvitationSchema,
    strategy: "output",
  },
  "organization-members": {
    schema: OrganizationMembersSchema,
    strategy: "output",
  },
  "upload-result-schema": { schema: UploadResultSchema, strategy: "output" },
  webhook: { schema: WebhookSchema, strategy: "output" },
  "webhook-summary": { schema: WebhookSummarySchema, strategy: "output" },
  "webhook-details": { schema: WebhookDetailsSchema, strategy: "output" },
  "ingest-job-payload": { schema: ingestJobPayloadSchema, strategy: "output" },
  "batch-payload": { schema: batchPayloadSchema, strategy: "output" },
  "text-payload": { schema: textPayloadSchema, strategy: "output" },
  "vector-store-config": { schema: VectorStoreSchema, strategy: "output" },

  // ---- standalone webhook event schemas (kept for the SDK via
  //      x-speakeasy-include; not referenced by any operation) ----
  WebhookEvent: { schema: webhookEventSchema },
  DocumentWebhookEvent: { schema: documentWebhookEventSchema },
  IngestJobWebhookEvent: { schema: ingestJobWebhookEventSchema },
};

// the input↔output pairs
for (const [name, schema] of Object.entries(IO_PAIR_SCHEMAS)) {
  commonSchemas[name] = { schema };
  const variant = outputVariants.get(schema);
  if (variant) {
    commonSchemas[variant.name] = { schema: variant.clone, strategy: "output" };
  }
}

/* -------------------------------------------------------------------------
 * Converter — interceptors patch the two places where plain identity-based
 * hoisting diverges from the legacy zod-openapi wiring.
 * ---------------------------------------------------------------------- */

type ConverterInterceptor = NonNullable<
  ConstructorParameters<typeof ZodToJsonSchemaConverter>[0]
>["interceptors"] extends (infer T)[] | undefined
  ? T
  : never;

/** Output-context usages of the IO pairs must reference "XOutput". */
const outputVariantInterceptor: ConverterInterceptor = (options) => {
  const variant = outputVariants.get(options.schema as z.ZodType);
  if (variant && options.options.strategy === "output") {
    return options.next({ ...options, schema: variant.clone as never });
  }
  return options.next();
};

/** `.describe()` clones of shared enums → `$ref` + sibling description. */
const enumCloneInterceptor: ConverterInterceptor = (options) => {
  const schema = options.schema as z.ZodType;
  const def = zodDef(schema);
  if (def.type === "enum") {
    const canonical = enumCanonicalsByEntries.get(def.entries);
    if (canonical && canonical !== schema) {
      const [required, json] = options.next({
        ...options,
        schema: canonical as never,
      });
      const description = z.globalRegistry.get(schema)?.description;
      return [
        required,
        typeof description === "string" ? { description, ...json } : json,
      ];
    }
  }
  return options.next();
};

/**
 * zod-openapi passed every zod `.meta()` key through into the JSON schema
 * (`deprecated`, `x-speakeasy-deprecation-message`, `example`, `style`, ...);
 * the oRPC converter only lifts title/description/examples.
 */
const HANDLED_META_KEYS = new Set([
  "id",
  "outputId",
  "title",
  "description",
  "examples",
]);

const metaPassthroughInterceptor: ConverterInterceptor = (options) => {
  const meta = z.globalRegistry.get(options.schema as z.ZodType);
  const extras = meta
    ? Object.entries(meta).filter(
        ([key, value]) => !HANDLED_META_KEYS.has(key) && value !== undefined,
      )
    : [];
  if (extras.length === 0) return options.next();
  const [required, json] = options.next();
  return [required, { ...json, ...Object.fromEntries(extras) }];
};

/**
 * Structural conversion differences vs the legacy zod-openapi output:
 * - discriminated unions were emitted as `{ type: "object", oneOf }`, plus a
 *   `discriminator` mapping when every member is a component `$ref`;
 * - output-context objects carried `additionalProperties: false`;
 * - output-context defaulted fields (and `.transform()`ed pipes) were
 *   required — the value is always present in a response.
 */
const legacyParityInterceptor: ConverterInterceptor = (options) => {
  const next = () => options.next();
  const def = zodDef(options.schema);
  const strategy = options.options.strategy;

  if (def.type === "union" && def.discriminator) {
    const [required, json] = next();
    if (Array.isArray(json.anyOf) && !json.oneOf) {
      const { anyOf, ...rest } = json;
      const result: Record<string, unknown> = {
        type: "object",
        oneOf: anyOf,
        ...rest,
      };
      const mapping = discriminatorMapping(def, anyOf);
      if (mapping) {
        result.discriminator = {
          propertyName: def.discriminator,
          mapping,
        };
      }
      return [required, result as typeof json];
    }
    return [required, json];
  }

  if (strategy === "output") {
    if (def.type === "default" || def.type === "prefault") {
      const [, json] = next();
      return [true, json];
    }
    if (def.type === "pipe" && zodDef(def.out).type === "transform") {
      const [, json] = next();
      return [true, json];
    }
    if (def.type === "object") {
      const [required, json] = next();
      if (json.type === "object" && json.additionalProperties === undefined) {
        json.additionalProperties = false;
      }
      return [required, json];
    }
  }

  if (def.type === "string") {
    // zod-openapi published `z.email()` with its regex pattern alongside the
    // format; the oRPC converter emits the format only
    const bag = (
      options.schema as unknown as {
        _zod: { bag?: { format?: string; patterns?: Set<RegExp> } };
      }
    )._zod.bag;
    if (bag?.format === "email" && bag.patterns?.size) {
      const [required, json] = next();
      if (json.format === "email" && json.pattern === undefined) {
        json.pattern = [...bag.patterns][0]!.source;
      }
      return [required, json];
    }
  }

  return next();
};

/** `discriminator.mapping` for all-`$ref` unions (mirrors zod-openapi). */
const discriminatorMapping = (
  def: ReturnType<typeof zodDef>,
  members: unknown[],
): Record<string, string> | undefined => {
  const options = def.options ?? [];
  if (members.length !== options.length) return undefined;

  const mapping: Record<string, string> = {};
  for (const [index, member] of members.entries()) {
    if (!isJsonObject(member) || typeof member.$ref !== "string") {
      return undefined;
    }
    const discriminatorField = def.discriminator
      ? zodDef(options[index]).shape?.[def.discriminator]
      : undefined;
    const values = discriminatorField
      ? zodDef(discriminatorField).values
      : undefined;
    const value = Array.isArray(values) ? values[0] : undefined;
    if (typeof value !== "string") return undefined;
    mapping[value] = member.$ref;
  }
  return mapping;
};

const schemaConverter = new ZodToJsonSchemaConverter({
  interceptors: [
    outputVariantInterceptor,
    enumCloneInterceptor,
    metaPassthroughInterceptor,
    legacyParityInterceptor,
  ],
});

/**
 * Success-response schemas replaced wholesale. The chat and search
 * procedures return unparsed data (`type<>()` passthrough outputs), so their
 * resource files document the 200 body via bare-converter spec overrides —
 * those can't hoist components or apply the parity interceptors. The bodies
 * are rebuilt here from the same zod schemas with the shared converter.
 */
const convertOutput = (
  schema: z.ZodType,
  components?: {
    schema: z.ZodType;
    required: boolean;
    ref: string;
    allowedStrategies: ("input" | "output")[];
  }[],
) => {
  const [, json] = schemaConverter.convert(schema, {
    strategy: "output",
    components,
  });
  return json as Record<string, unknown>;
};

const RESPONSE_SCHEMA_OVERRIDES: Record<
  string,
  { status: string; schema: Record<string, unknown> }
> = {
  chat: {
    status: "200",
    schema: convertOutput(successSchema(chatResponseSchema), [
      {
        schema: chatResponseSchema,
        required: true,
        ref: "#/components/schemas/chat-response",
        allowedStrategies: ["output"],
      },
    ]),
  },
  search: {
    status: "200",
    schema: convertOutput(successSchema(z.array(NodeSchema))),
  },
};

/* -------------------------------------------------------------------------
 * Post-processing — pure, deterministic transforms over the generated
 * document.
 * ---------------------------------------------------------------------- */

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Depth-first visit of every plain object in the document. */
const walkObjects = (node: unknown, visit: (obj: JsonObject) => void) => {
  if (Array.isArray(node)) {
    for (const item of node) walkObjects(item, visit);
  } else if (isJsonObject(node)) {
    visit(node);
    for (const value of Object.values(node)) walkObjects(value, visit);
  }
};

/**
 * The legacy document annotated literals with their JSON type
 * (`{"type":"boolean","const":true}`); the oRPC converter omits it.
 */
const addConstTypes = (obj: JsonObject) => {
  if (!("const" in obj) || "type" in obj || "$ref" in obj) return;
  const constType = typeof obj.const;
  if (
    constType === "string" ||
    constType === "number" ||
    constType === "boolean"
  ) {
    obj.type = constType;
  }
};

/**
 * Drop oRPC-only `x-native-type` annotations. `z.date()` responses were
 * published as plain strings (no `format`) by the legacy spec, so the
 * date-time format goes with it.
 */
const stripNativeTypes = (obj: JsonObject) => {
  if (!("x-native-type" in obj)) return;
  if (obj["x-native-type"] === "date" && obj.format === "date-time") {
    delete obj.format;
  }
  delete obj["x-native-type"];
};

/** oRPC parameter-serialization hints the legacy spec never carried. */
const stripParameterNoise = (param: JsonObject) => {
  delete param.allowEmptyValue;
  delete param.allowReserved;
  delete param.style;
  delete param.explode;

  // legacy per-page parameter shape: numeric bounds as $ref siblings
  if (isJsonObject(param.schema) && param.schema.$ref === PER_PAGE_REF) {
    Object.assign(param.schema, PER_PAGE_PARAM_SIBLINGS);
  }
};

const rewriteOperation = (path: string, operation: JsonObject) => {
  const operationId = operation.operationId as string | undefined;
  const responses = (operation.responses ?? {}) as JsonObject;

  // 1. soft deletes: rename the success key ("200" → "204", legacy quirk)
  const rename = operationId && SOFT_DELETE_STATUS_RENAMES[operationId];
  if (rename && responses[rename[0]] !== undefined) {
    const renamed: JsonObject = { [rename[1]]: responses[rename[0]] };
    for (const [status, response] of Object.entries(responses)) {
      if (status !== rename[0]) renamed[status] = response;
    }
    operation.responses = renamed;
  }

  // 2. hard deletes: bare "204" with no content
  if (operationId && EMPTY_204_OPERATIONS.has(operationId)) {
    (operation.responses as JsonObject)["204"] = {
      description: SUCCESS_DESCRIPTIONS[operationId],
    };
  }

  // 3. success descriptions (the generator emits "OK")
  if (operationId && SUCCESS_DESCRIPTIONS[operationId]) {
    for (const [status, response] of Object.entries(
      operation.responses as JsonObject,
    )) {
      if (status.startsWith("2") && isJsonObject(response)) {
        response.description = SUCCESS_DESCRIPTIONS[operationId];
      }
    }
  }

  // 4. shared error responses on every operation
  operation.responses = {
    ...(operation.responses as JsonObject),
    ...ERROR_RESPONSE_REFS,
  };

  // 5. parameters: inline path params → shared $refs (ordered by their
  //    appearance in the path), tenant header appended last, query params
  //    keep their generated order but lose oRPC serialization hints
  const parameters = (operation.parameters ?? []) as JsonObject[];
  const nonPathParams = parameters.filter((param) => param.in !== "path");
  for (const param of nonPathParams) stripParameterNoise(param);

  const pathParamRefs = [...path.matchAll(/\{(\w+)\}/g)]
    .map((match) => PATH_PARAM_COMPONENTS[match[1] ?? ""])
    .filter((component): component is string => !!component)
    .map((component) => ({ $ref: `#/components/parameters/${component}` }));

  const tenantRefs =
    operationId && TENANT_HEADER_OPERATIONS.has(operationId)
      ? [{ $ref: "#/components/parameters/TenantIdRef" }]
      : [];

  const rewritten = [...nonPathParams, ...pathParamRefs, ...tenantRefs];
  if (rewritten.length > 0) {
    operation.parameters = rewritten;
  } else {
    delete operation.parameters;
  }

  // 6. request bodies: the legacy document marked every body required, and
  //    some were published as a top-level component $ref
  if (isJsonObject(operation.requestBody)) {
    operation.requestBody.required = true;

    const bodyRef = operationId && REQUEST_BODY_COMPONENT_REFS[operationId];
    const content = operation.requestBody.content as JsonObject | undefined;
    const jsonContent = content?.["application/json"];
    if (bodyRef && isJsonObject(jsonContent)) {
      jsonContent.schema = { $ref: `#/components/schemas/${bodyRef}` };
    }
  }

  // 7. pinned success-response schemas
  const override = operationId && RESPONSE_SCHEMA_OVERRIDES[operationId];
  if (override) {
    const response = (operation.responses as JsonObject)[override.status];
    if (isJsonObject(response)) {
      const content = response.content as JsonObject | undefined;
      const jsonContent = content?.["application/json"];
      if (isJsonObject(jsonContent)) jsonContent.schema = override.schema;
    }
  }
};

const postProcess = (document: JsonObject): JsonObject => {
  // /v1 prefix lives in the route handler (`handler.handle`), not in the
  // procedures' paths — re-key so the published document keeps it.
  const paths = (document.paths ?? {}) as JsonObject;
  const prefixedPaths: JsonObject = Object.fromEntries(
    Object.entries(paths).map(([path, item]) => [`/v1${path}`, item]),
  );
  document.paths = prefixedPaths;

  for (const [path, pathItem] of Object.entries(prefixedPaths)) {
    if (!isJsonObject(pathItem)) continue;
    for (const operation of Object.values(pathItem)) {
      if (isJsonObject(operation)) rewriteOperation(path, operation);
    }
  }

  document["x-speakeasy-globals"] = SPEAKEASY_GLOBALS;

  const components = (document.components ?? {}) as JsonObject;
  document.components = components;
  components.parameters = PARAMETER_COMPONENTS;
  components.responses = ERROR_RESPONSE_COMPONENTS;

  // counterpart of PER_PAGE_PARAM_SIBLINGS: the legacy component carried the
  // bare number schema, with the bounds living at the parameter sites
  const schemas = components.schemas as JsonObject | undefined;
  const perPage = schemas?.["pagination-per-page"];
  if (isJsonObject(perPage)) {
    delete perPage.minimum;
    delete perPage.maximum;
  }

  walkObjects(document, (obj) => {
    addConstTypes(obj);
    stripNativeTypes(obj);
  });

  return document;
};

/* ------------------------------------------------------------------------- */

const generator = new OpenAPIGenerator({
  schemaConverters: [schemaConverter],
});

export const buildOpenApiDocument = async (): Promise<JsonObject> => {
  const document = await generator.generate(appRouter, {
    info: INFO,
    servers: SERVERS,
    components: { securitySchemes: SECURITY_SCHEMES as never },
    commonSchemas: commonSchemas as never,
    // published operations only: dashboard-only procedures have no route
    // metadata and the hidden PUT aliases have no operationId
    filter: ({ contract }) => !!contract["~orpc"].route.operationId,
  });

  return postProcess(document as unknown as JsonObject);
};
