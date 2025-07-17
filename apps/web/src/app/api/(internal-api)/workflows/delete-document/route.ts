import type { DeleteDocumentBody } from "@/lib/workflow";
import { chunkArray } from "@/lib/functions";
import { KeywordStore } from "@/lib/keyword-store";
import { deleteObject } from "@/lib/s3";
import { getNamespaceVectorStore } from "@/lib/vector-store";
import { cancelWorkflow, qstashClient, qstashReceiver } from "@/lib/workflow";
import { serve } from "@upstash/workflow/nextjs";

import { db, DocumentStatus } from "@agentset/db";

const BATCH_SIZE = 30;

export const { POST } = serve<DeleteDocumentBody>(
  async (context) => {
    const data = await context.run("get-config", async () => {
      const { documentId } = context.requestPayload;
      const doc = await db.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          tenantId: true,
          source: true,
          workflowRunsIds: true,
          totalPages: true,
          ingestJob: { select: { id: true, namespace: true } },
        },
      });

      if (!doc) {
        return {
          notFound: true,
          shouldDeleteJob: false,
          shouldDeleteNamespace: false,
          shouldDeleteOrg: false,
        };
      }

      return {
        ...doc,
        shouldDeleteJob: context.requestPayload.deleteJobWhenDone ?? false,
        shouldDeleteNamespace:
          context.requestPayload.deleteNamespaceWhenDone ?? false,
        shouldDeleteOrg: context.requestPayload.deleteOrgWhenDone ?? false,
      };
    });

    if ("notFound" in data) {
      return;
    }

    const {
      ingestJob: { namespace, ...ingestJob },
      shouldDeleteJob,
      shouldDeleteNamespace,
      shouldDeleteOrg,
      ...document
    } = data;

    await context.run("update-status-deleting", async () => {
      await db.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.DELETING,
        },
        select: { id: true },
      });
    });

    await context.run("cancel-document-workflows", async () => {
      const currentWorkflowRunId = context.workflowRunId;
      const idsToCancel = document.workflowRunsIds.filter(
        (id) => id !== currentWorkflowRunId,
      );

      if (idsToCancel.length > 0) {
        await cancelWorkflow({ ids: idsToCancel });
      }
    });

    const vectorStore = await getNamespaceVectorStore(
      namespace,
      document.tenantId ?? undefined,
    );

    const chunkIdsToDelete = await context.run("get-chunk-ids", async () => {
      let paginationToken: string | undefined;
      const chunkIds: string[] = [];

      do {
        const chunks = await vectorStore.list({
          prefix: `${document.id}#`,
          paginationToken,
        });

        chunks.vectors?.forEach((chunk) => {
          if (chunk.id) {
            chunkIds.push(chunk.id);
          }
        });

        paginationToken = chunks.pagination?.next;
      } while (paginationToken);

      return chunkIds;
    });

    await context.run("delete-vector-store-chunks", async () => {
      const batches = chunkArray(chunkIdsToDelete, BATCH_SIZE);
      for (const batch of batches) {
        await vectorStore.delete(batch);
      }
    });

    if (namespace.keywordEnabled) {
      const keywordStore = new KeywordStore(
        namespace.id,
        document.tenantId ?? undefined,
      );

      const keywordChunkIdsToDelete = await context.run(
        "cleanup-get-keyword-store-chunk-ids",
        async () => {
          let page: number = 1;
          let hasNextPage: boolean = true;
          const chunkIds: string[] = [];

          do {
            const chunks = await keywordStore.listIds({
              documentId: document.id,
              page,
            });

            chunkIds.push(...chunks.ids);

            hasNextPage = chunks.hasNextPage;
            page = chunks.currentPage + 1;
          } while (hasNextPage);

          return chunkIds;
        },
      );

      await context.run("cleanup-keyword-store-chunks", async () => {
        if (keywordChunkIdsToDelete.length === 0) return;

        const batches = chunkArray(keywordChunkIdsToDelete, BATCH_SIZE);
        for (const batch of batches) {
          await keywordStore.deleteByIds(batch);
        }
      });
    }

    await context.run("delete-document", async () => {
      await db.$transaction([
        db.document.delete({
          where: { id: document.id },
          select: { id: true },
        }),
        db.namespace.update({
          where: { id: namespace.id },
          data: {
            totalDocuments: { decrement: 1 },
            totalPages: { decrement: document.totalPages },
            organization: {
              update: {
                totalDocuments: { decrement: 1 },
                totalPages: { decrement: document.totalPages },
              },
            },
          },
        }),
      ]);
    });

    await context.run("check-and-delete-managed-file", async () => {
      if (document.source.type === "MANAGED_FILE") {
        await deleteObject(document.source.key);
      }
    });

    if (shouldDeleteJob) {
      await context.run("check-and-delete-ingest-job", async () => {
        const document = await db.document.findFirst({
          where: { ingestJobId: ingestJob.id },
        });

        if (!document) {
          // TODO: delete payload
          await db
            .$transaction([
              db.ingestJob.delete({
                where: { id: ingestJob.id },
                select: { id: true },
              }),
              db.namespace.update({
                where: { id: namespace.id },
                select: { id: true },
                data: {
                  totalIngestJobs: { decrement: 1 },
                  organization: {
                    update: {
                      totalIngestJobs: { decrement: 1 },
                    },
                  },
                },
              }),
            ])
            .catch((e) => {
              if (e.code === "P2025") {
                return null; // already deleted
              }

              throw e;
            });

          return true;
        }

        return false;
      });
    }

    if (shouldDeleteNamespace) {
      await context.run("check-and-delete-namespace", async () => {
        const job = await db.ingestJob.findFirst({
          where: { namespaceId: namespace.id },
          select: { id: true },
        });

        if (!job) {
          await db.$transaction([
            db.namespace.delete({
              where: { id: namespace.id },
              select: { id: true },
            }),
            db.organization.update({
              where: { id: namespace.organizationId },
              select: { id: true },
              data: { totalNamespaces: { decrement: 1 } },
            }),
          ]);
          return true;
        }

        return false;
      });
    }

    if (shouldDeleteOrg) {
      await context.run("check-and-delete-org", async () => {
        const ns = await db.namespace.findFirst({
          where: { organizationId: namespace.organizationId },
          select: { id: true },
        });

        if (!ns) {
          await db.organization
            .delete({
              where: { id: namespace.organizationId },
            })
            .catch((e) => {
              if (e.code === "P2025") {
                return null; // already deleted
              }

              throw e;
            });

          return true;
        }

        return false;
      });
    }
  },
  {
    qstashClient: qstashClient,
    receiver: qstashReceiver,
    flowControl: {
      key: "delete-document",
      parallelism: 100,
      rate: 50,
      period: "1m",
    },
  },
);
