import type z from "@/lib/zod";
import type { createIngestJobSchema } from "@/schemas/api/ingest-job";
import { checkFileExists } from "@/lib/s3";
import { triggerIngestionJob } from "@/lib/workflow";

import type { IngestJobBatchItem } from "@agentset/validation";
import { db, IngestJobStatus } from "@agentset/db";

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
    const exists = await checkFileExists(data.payload.key);
    if (!exists) {
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
        files.map((file) => checkFileExists(file.key)),
      );

      const missingKeys = results.filter((result) => !result);
      if (missingKeys.length > 0) {
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

  const { workflowRunId } = await triggerIngestionJob({ jobId: job.id });

  await db.ingestJob.update({
    where: { id: job.id },
    data: { workflowRunsIds: { push: workflowRunId } },
    select: { id: true },
  });

  return job;
};
