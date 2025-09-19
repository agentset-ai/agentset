import type { createIngestJobSchema } from "@/schemas/api/ingest-job";
import type { z } from "zod/v4";

import type { IngestJobBatchItem } from "@agentset/validation";
import { db, IngestJobStatus } from "@agentset/db";
import { triggerIngestionJob } from "@agentset/jobs";
import { checkFileExists } from "@agentset/storage";

import { validateNamespaceFileKey } from "../uploads";

export const createIngestJob = async ({
  namespaceId,
  tenantId,
  data,
}: {
  namespaceId: string;
  tenantId?: string;
  data: z.infer<typeof createIngestJobSchema>;
}) => {
  let finalPayload: PrismaJson.IngestJobPayload | null = null;

  if (data.payload.type === "TEXT") {
    finalPayload = {
      type: "TEXT",
      text: data.payload.text,
      ...(data.payload.fileName && { fileName: data.payload.fileName }),
    };
  } else if (data.payload.type === "FILE") {
    finalPayload = {
      type: "FILE",
      fileUrl: data.payload.fileUrl,
      ...(data.payload.fileName && { fileName: data.payload.fileName }),
    };
  } else if (data.payload.type === "MANAGED_FILE") {
    if (
      !validateNamespaceFileKey(namespaceId, data.payload.key) ||
      !(await checkFileExists(data.payload.key))
    ) {
      throw new Error("FILE_NOT_FOUND");
    }

    finalPayload = {
      type: "MANAGED_FILE",
      key: data.payload.key,
      ...(data.payload.fileName && { fileName: data.payload.fileName }),
    };
  } else if (data.payload.type === "BATCH") {
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
        throw new Error("FILE_NOT_FOUND");
      }
    }

    finalPayload = {
      type: "BATCH",
      items: finalItems,
    };
  }

  if (!finalPayload) {
    throw new Error("INVALID_PAYLOAD");
  }

  const [job] = await db.$transaction([
    db.ingestJob.create({
      data: {
        namespace: { connect: { id: namespaceId } },
        tenantId,
        status: IngestJobStatus.QUEUED,
        name: data.name,
        config: data.config,
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

  const handle = await triggerIngestionJob({
    jobId: job.id,
  });

  await db.ingestJob.update({
    where: { id: job.id },
    data: { workflowRunsIds: { push: handle.id } },
    select: { id: true },
  });

  return job;
};
