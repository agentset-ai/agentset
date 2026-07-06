import type { createIngestJobSchema } from "@/schemas/api/ingest-job";
import type { z } from "zod/v4";
import { AgentsetApiError, exceededLimitError } from "@/lib/api/errors";
import { emitIngestJobWebhook } from "@/lib/webhook/emit";
import { waitUntil } from "@vercel/functions";

import type { IngestJob, Organization } from "@agentset/db";
import type { IngestJobBatchItem } from "@agentset/validation";
import { IngestJobStatus, Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";
import { triggerIngestionJob } from "@agentset/jobs";
import { checkFileExists } from "@agentset/storage";
import { isFreePlan } from "@agentset/stripe/plans";

import { validateNamespaceFileKey } from "../uploads";

export const createIngestJob = async ({
  organization,
  namespaceId,
  tenantId,
  data,
}: {
  organization: Pick<
    Organization,
    "id" | "plan" | "totalPages" | "pagesLimit"
  >;
  namespaceId: string;
  tenantId?: string;
  data: z.infer<typeof createIngestJobSchema>;
}) => {
  // if it's not a pro plan, check if the user has exceeded the limit
  // pro plan is unlimited with usage based billing
  if (
    isFreePlan(organization.plan) &&
    organization.totalPages >= organization.pagesLimit
  ) {
    throw new AgentsetApiError({
      code: "rate_limit_exceeded",
      message: exceededLimitError({
        plan: organization.plan,
        limit: organization.pagesLimit,
        type: "pages",
      }),
    });
  }

  let finalPayload: PrismaJson.IngestJobPayload | null = null;

  if (data.payload.type === "BATCH") {
    const finalItems: IngestJobBatchItem[] = [];
    for (const item of data.payload.items) {
      // deduplicate urls and files
      if (
        (item.type === "FILE" &&
          finalItems.find(
            (f) => f.type === "FILE" && f.fileUrl === item.fileUrl,
          )) ||
        (item.type === "MANAGED_FILE" &&
          finalItems.find(
            (f) => f.type === "MANAGED_FILE" && f.key === item.key,
          ))
      )
        continue;

      finalItems.push(item);
    }

    // validate managed files
    const files = finalItems.filter((item) => item.type === "MANAGED_FILE");
    if (files.length > 0) {
      const results = await Promise.all(
        files.map(
          async (file) =>
            validateNamespaceFileKey(namespaceId, file.key) &&
            (await checkFileExists(file.key)),
        ),
      );

      const invalidKey = results.some((result) => !result);
      if (invalidKey) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "File not found",
        });
      }
    }

    finalPayload = {
      type: "BATCH",
      items: finalItems,
    };
  } else if (data.payload.type === "CRAWL" || data.payload.type === "YOUTUBE") {
    finalPayload = {
      ...data.payload,
    };
  } else {
    const commonPayload = {
      ...(data.payload.fileName && { fileName: data.payload.fileName }),
      // TODO: bring this back when we implement document external ID
      // ...(data.payload.externalId && { externalId: data.payload.externalId }),
    };
    if (data.payload.type === "TEXT") {
      finalPayload = {
        type: "TEXT",
        text: data.payload.text,
        ...commonPayload,
      };
    } else if (data.payload.type === "FILE") {
      finalPayload = {
        type: "FILE",
        fileUrl: data.payload.fileUrl,
        ...commonPayload,
      };
    } else {
      const exists =
        validateNamespaceFileKey(namespaceId, data.payload.key) &&
        (await checkFileExists(data.payload.key));
      if (!exists) {
        throw new AgentsetApiError({
          code: "bad_request",
          message: "File not found",
        });
      }

      finalPayload = {
        type: "MANAGED_FILE",
        key: data.payload.key,
        ...commonPayload,
      };
    }
  }

  const config = structuredClone(data.config);
  if (
    config &&
    (finalPayload.type === "TEXT" ||
      finalPayload.type === "CRAWL" ||
      finalPayload.type === "YOUTUBE")
  ) {
    const fieldsToDelete: (keyof typeof config)[] = [
      "mode",
      "disableImageExtraction",
      "disableImageCaptions",
      "keepPagefooterInOutput",
      "keepPageheaderInOutput",
      "chartUnderstanding",
    ];

    // filter fields that are not supported for the payload type
    for (const field of fieldsToDelete) {
      if (config[field] !== undefined) delete config[field];
    }
  }

  // filter deprecated fields
  if (config?.chunkOverlap !== undefined) delete config.chunkOverlap;
  if (config?.maxChunkSize !== undefined) delete config.maxChunkSize;
  if (config?.chunkingStrategy !== undefined) delete config.chunkingStrategy;
  if (config?.strategy !== undefined) delete config.strategy;
  if (config?.disableOcrMath !== undefined) delete config.disableOcrMath;
  if (config?.forceOcr !== undefined) delete config.forceOcr;
  if (config?.useLlm !== undefined) delete config.useLlm;

  let job: IngestJob;
  try {
    [job] = await db.$transaction([
      db.ingestJob.create({
        data: {
          namespace: { connect: { id: namespaceId } },
          tenantId,
          status: IngestJobStatus.QUEUED,
          name: data.name,
          config: config,
          externalId: data.externalId,
          payload: finalPayload,
        },
      }),
      db.namespace.update({
        where: { id: namespaceId },
        data: {
          totalIngestJobs: { increment: 1 },
          organization: {
            update: {
              totalIngestJobs: { increment: 1 },
            },
          },
        },
        select: { id: true },
      }),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AgentsetApiError({
        code: "conflict",
        message: `The external ID "${data.externalId}" is already in use.`,
      });
    }

    throw error;
  }

  const handle = await triggerIngestionJob(
    {
      jobId: job.id,
      organizationId: organization.id,
    },
    organization.plan,
  );

  await db.ingestJob.update({
    where: { id: job.id },
    data: { workflowRunsIds: { push: handle.id } },
    select: { id: true },
  });

  // Emit ingest_job.queued webhook
  waitUntil(
    emitIngestJobWebhook({
      trigger: "ingest_job.queued",
      ingestJob: {
        ...job,
        organizationId: organization.id,
      },
    }),
  );

  return job;
};
