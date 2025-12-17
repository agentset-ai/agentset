import { schemaTask } from "@trigger.dev/sdk";

import { deleteAsset } from "@agentset/storage";
import { env } from "@agentset/storage/env";
import { chunkArray } from "@agentset/utils";

import { getDb } from "../db";
import { DELETE_NAMESPACE_JOB_ID, deleteNamespaceBodySchema } from "../schema";
import { deleteIngestJob } from "./delete-ingest-job";

const BATCH_SIZE = 30;

export const deleteNamespace = schemaTask({
  id: DELETE_NAMESPACE_JOB_ID,
  maxDuration: 1800, // 30 minutes
  queue: {
    concurrencyLimit: 50,
  },
  schema: deleteNamespaceBodySchema,
  run: async ({ namespaceId }) => {
    const db = getDb();

    // Get namespace data
    const namespace = await db.namespace.findUnique({
      where: { id: namespaceId },
      select: {
        id: true,
        organizationId: true,
        hosting: {
          select: {
            id: true,
            logo: true,
            ogImage: true,
          },
        },
      },
    });

    if (!namespace) {
      return {
        namespaceId,
        deleted: false,
        reason: "Namespace not found",
      };
    }

    // Get all ingest jobs for this namespace
    const ingestJobs = await db.ingestJob.findMany({
      where: { namespaceId: namespace.id },
      select: { id: true },
    });

    // Trigger ingest job deletion tasks (parent-child pattern)
    if (ingestJobs.length > 0) {
      const batches = chunkArray(ingestJobs, BATCH_SIZE);

      for (const batch of batches) {
        await deleteIngestJob.batchTriggerAndWait(
          batch.map((job) => ({
            payload: {
              jobId: job.id,
            },
            options: {
              tags: [`job_${job.id}`],
            },
          })),
        );
      }
    }

    // Delete hosting logo if it exists
    if (namespace.hosting?.logo) {
      await deleteAsset(
        namespace.hosting.logo.replace(`${env.ASSETS_S3_URL}/`, ""),
      );
    }

    // Delete og image if it exists
    if (namespace.hosting?.ogImage) {
      await deleteAsset(
        namespace.hosting.ogImage.replace(`${env.ASSETS_S3_URL}/`, ""),
      );
    }

    // Delete the namespace directly
    await db.$transaction([
      db.namespace.delete({
        where: { id: namespace.id },
        select: { id: true },
      }),
      db.organization.update({
        where: { id: namespace.organizationId },
        data: {
          totalNamespaces: { decrement: 1 },
        },
      }),
    ]);

    return {
      namespaceId: namespace.id,
      deleted: true,
    };
  },
});
