import type { updateMetadataSchema } from "@/schemas/api/metadata";
import type { z } from "zod/v4";
import { AgentsetApiError } from "@/lib/api/errors";
import { metadataUpdateResultSchema } from "@/schemas/api/metadata";

import type { DocumentStatus, IngestJobStatus } from "@agentset/db";
import { metadataFilterToSql, Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";
import {
  retrieveMetadataUpdate,
  triggerUpdateMetadata,
  UPDATE_METADATA_JOB_ID,
  updateMetadataBodySchema,
} from "@agentset/jobs";

const MAX_MATCHES = 1000;
const stableStatuses = new Set<string>(["COMPLETED", "FAILED", "CANCELLED"]);

type MatchedDocument = {
  id: string;
  status: DocumentStatus;
  jobStatus: IngestJobStatus;
};

const assertStable = (statuses: string[]) => {
  if (statuses.some((status) => !stableStatuses.has(status))) {
    throw new AgentsetApiError({
      code: "conflict",
      message:
        "Metadata can only be updated after all matching documents and ingest jobs have completed, failed, or been cancelled.",
    });
  }
};

const assertSize = (count: number) => {
  if (count > MAX_MATCHES) {
    throw new AgentsetApiError({
      code: "bad_request",
      message:
        "A metadata update can match at most 1,000 documents and 1,000 ingest jobs. Use a narrower filter.",
    });
  }
};

export const queueMetadataUpdate = async ({
  namespaceId,
  tenantId,
  target,
  data,
}: {
  namespaceId: string;
  tenantId?: string;
  target: "documents" | "ingest-jobs";
  data: z.infer<typeof updateMetadataSchema>;
}) => {
  const tenant = tenantId ?? null;
  let jobIds: string[] = [];
  let documents: MatchedDocument[];

  if (target === "documents") {
    const predicate = metadataFilterToSql(
      data.filter,
      Prisma.sql`(COALESCE(j.config->'metadata', '{}'::jsonb) || COALESCE(d.config->'metadata', '{}'::jsonb))`,
    );
    documents = await db.$queryRaw<MatchedDocument[]>(Prisma.sql`
      SELECT d.id, d.status, j.status AS "jobStatus"
      FROM document d JOIN ingest_job j ON j.id = d."ingestJobId"
      WHERE d."namespaceId" = ${namespaceId}
        AND d."tenantId" IS NOT DISTINCT FROM ${tenant}
        AND j."namespaceId" = ${namespaceId}
        AND j."tenantId" IS NOT DISTINCT FROM ${tenant}
        AND ${predicate}
      ORDER BY d.id LIMIT ${MAX_MATCHES + 1}
    `);
  } else {
    const predicate = metadataFilterToSql(
      data.filter,
      Prisma.sql`COALESCE(j.config->'metadata', '{}'::jsonb)`,
    );
    const jobs = await db.$queryRaw<
      { id: string; status: IngestJobStatus }[]
    >(Prisma.sql`
      SELECT j.id, j.status FROM ingest_job j
      WHERE j."namespaceId" = ${namespaceId}
        AND j."tenantId" IS NOT DISTINCT FROM ${tenant}
        AND ${predicate}
      ORDER BY j.id LIMIT ${MAX_MATCHES + 1}
    `);
    assertSize(jobs.length);
    assertStable(jobs.map((job) => job.status));
    jobIds = jobs.map((job) => job.id);
    const children = jobIds.length
      ? await db.document.findMany({
          where: { namespaceId, tenantId: tenant, ingestJobId: { in: jobIds } },
          select: {
            id: true,
            status: true,
            ingestJob: { select: { status: true } },
          },
          orderBy: { id: "asc" },
          take: MAX_MATCHES + 1,
        })
      : [];
    documents = children.map(({ ingestJob, ...document }) => ({
      ...document,
      jobStatus: ingestJob.status,
    }));
  }

  assertSize(documents.length);
  assertStable(
    documents.flatMap((document) => [document.status, document.jobStatus]),
  );

  if (!documents.length && !jobIds.length) {
    return { runId: null, matchedDocuments: 0, matchedJobs: 0 };
  }

  const handle = await triggerUpdateMetadata({
    namespaceId,
    tenantId: tenant,
    documentIds: documents.map((document) => document.id),
    jobIds,
    metadata: data.metadata,
  });

  return {
    runId: handle.id,
    matchedDocuments: documents.length,
    matchedJobs: jobIds.length,
  };
};

export const getMetadataUpdateStatus = async ({
  namespaceId,
  tenantId,
  runId,
}: {
  namespaceId: string;
  tenantId?: string;
  runId: string;
}) => {
  // Retrieve only this task's runs, then authorize the stored selection scope.
  const run = await retrieveMetadataUpdate(runId).catch((error: unknown) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 404
    ) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Metadata update not found.",
      });
    }
    throw error;
  });
  const payload = updateMetadataBodySchema.safeParse(run.payload);
  if (
    run.taskIdentifier !== UPDATE_METADATA_JOB_ID ||
    !payload.success ||
    payload.data.namespaceId !== namespaceId ||
    payload.data.tenantId !== (tenantId ?? null)
  ) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Metadata update not found.",
    });
  }

  return {
    runId: run.id,
    status: run.status,
    result:
      run.status === "COMPLETED"
        ? metadataUpdateResultSchema.parse(run.output)
        : null,
  };
};
