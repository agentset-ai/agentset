/**
 * Create ingest job
 *
 * Creates a new ingest job with validation and triggers the ingestion process.
 */

import type { createIngestJobSchema } from "@/schemas/api/ingest-job";
import type { z } from "zod/v4";
import { AgentsetApiError } from "@/lib/api/errors";

import type { IngestJobBatchItem } from "@agentset/validation";
import { IngestJobStatus } from "@agentset/db";
import { triggerIngestionJob } from "@agentset/jobs";
import { checkFileExists } from "@agentset/storage";
import { isFreePlan } from "@agentset/stripe/plans";

import type { AgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";
import { validateNamespaceFileKey } from "../uploads";

export const createIngestJob = async (
  context: AgentsetContext,
  input: {
    namespaceId: string;
    tenantId?: string;
    data: z.infer<typeof createIngestJobSchema>;
  },
) => {
  const namespace = await getNamespace(context, {
    id: input.namespaceId,
  });

  const organization = await context.db.organization.findUnique({
    where: { id: namespace.organizationId },
  });

  if (!organization) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Organization not found",
    });
  }

  // if it's not a pro plan, check if the user has exceeded the limit
  // pro plan is unlimited with usage based billing
  if (
    isFreePlan(organization.plan) &&
    organization.totalPages >= organization.pagesLimit
  ) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "You've reached the maximum number of pages.",
    });
  }

  const plan = organization.plan;
  const namespaceId = namespace.id;
  const tenantId = input.tenantId;
  const data = input.data;
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
          code: "not_found",
          message: "One or more files not found",
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
    } else if (data.payload.type === "MANAGED_FILE") {
      const exists = await checkFileExists(data.payload.key);
      if (!exists) {
        throw new AgentsetApiError({
          code: "not_found",
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

  if (!finalPayload) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Invalid payload",
    });
  }

  const config = structuredClone(data.config);
  if (
    config &&
    (finalPayload.type === "TEXT" ||
      finalPayload.type === "CRAWL" ||
      finalPayload.type === "YOUTUBE")
  ) {
    // filter fields that are not supported for the payload type
    if (config.disableImageExtraction !== undefined)
      delete config.disableImageExtraction;
    if (config.disableOcrMath !== undefined) delete config.disableOcrMath;
    if (config.forceOcr !== undefined) delete config.forceOcr;
    if (config.mode !== undefined) delete config.mode;
    if (config.useLlm !== undefined) delete config.useLlm;
  }

  // filter deprecated fields
  if (config?.chunkOverlap !== undefined) delete config.chunkOverlap;
  if (config?.maxChunkSize !== undefined) delete config.maxChunkSize;
  if (config?.chunkingStrategy !== undefined) delete config.chunkingStrategy;
  if (config?.strategy !== undefined) delete config.strategy;

  const [job] = await context.db.$transaction([
    context.db.ingestJob.create({
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
    context.db.namespace.update({
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

  const handle = await triggerIngestionJob(
    {
      jobId: job.id,
    },
    plan,
  );

  await context.db.ingestJob.update({
    where: { id: job.id },
    data: { workflowRunsIds: { push: handle.id } },
    select: { id: true },
  });

  return job;
};
