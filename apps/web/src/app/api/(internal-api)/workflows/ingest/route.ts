import type { TriggerIngestionJobBody } from "@/lib/workflow";
import { chunkArray } from "@/lib/functions";
import {
  qstashClient,
  qstashReceiver,
  triggerDocumentJob,
} from "@/lib/workflow";
import { serve } from "@upstash/workflow/nextjs";

import type { Document, Prisma } from "@agentset/db";
import { db, DocumentStatus, IngestJobStatus } from "@agentset/db";

const BATCH_SIZE = 30;

export const { POST } = serve<TriggerIngestionJobBody>(
  async (context) => {
    const ingestionJob = await context.run("get-config", async () => {
      const { jobId } = context.requestPayload;
      const ingestionJob = await db.ingestJob.findUnique({
        where: { id: jobId },
        include: { namespace: true },
      });

      if (!ingestionJob) {
        throw new Error("Ingestion job not found");
      }

      return ingestionJob;
    });

    await context.run("update-status-pre-processing", async () => {
      await db.ingestJob.update({
        where: { id: ingestionJob.id },
        data: {
          status: IngestJobStatus.PRE_PROCESSING,
          preProcessingAt: new Date(),
        },
        select: { id: true },
      });
    });

    const commonData = {
      status: DocumentStatus.QUEUED,
      tenantId: ingestionJob.tenantId,
      ingestJobId: ingestionJob.id,
      // metadata: ingestionJob.config?.metadata, // NOTE: we currently get document metadata from the job directly
    } satisfies Partial<Prisma.DocumentCreateArgs["data"]>;

    let documents: Pick<Document, "id">[] = [];

    if (
      ingestionJob.payload.type === "FILE" ||
      ingestionJob.payload.type === "TEXT" ||
      ingestionJob.payload.type === "MANAGED_FILE"
    ) {
      documents = await context.run("create-documents", async () => {
        if (ingestionJob.payload.type === "TEXT") {
          const { text } = ingestionJob.payload;
          const document = await db.document.create({
            data: {
              ...commonData,
              name: ingestionJob.payload.fileName,
              source: {
                type: "TEXT",
                text,
              },
              totalCharacters: text.length,
            },
            select: { id: true },
          });

          return [document];
        }

        if (ingestionJob.payload.type === "FILE") {
          const { fileUrl } = ingestionJob.payload;
          const document = await db.document.create({
            data: {
              ...commonData,
              name: ingestionJob.payload.fileName,
              source: {
                type: "FILE",
                fileUrl: fileUrl,
              },
            },
            select: { id: true },
          });

          return [document];
        }

        if (ingestionJob.payload.type === "MANAGED_FILE") {
          const { key } = ingestionJob.payload;
          const document = await db.document.create({
            data: {
              ...commonData,
              name: ingestionJob.payload.fileName,
              source: {
                type: "MANAGED_FILE",
                key: key,
              },
            },
            select: { id: true },
          });

          return [document];
        }

        return [];
      });
    } else if (ingestionJob.payload.type === "BATCH") {
      // we need to batch create the documents
      const batches = chunkArray(ingestionJob.payload.items, 20);

      for (let i = 0; i < batches.length; i++) {
        const fileBatch = batches[i]!;
        const batchResult = await context.run(
          `create-documents-${i}`,
          async () => {
            const newDocuments = await db.document.createManyAndReturn({
              select: { id: true },
              data: fileBatch.map(({ config, fileName, ...file }) => ({
                ...commonData,
                name: fileName,
                source: file,
                config,
              })),
            });

            return newDocuments.flat();
          },
        );

        documents = documents.concat(batchResult);
      }
    }

    // update total documents in namespace + organization
    await context.run("update-total-documents", async () => {
      await db.namespace.update({
        where: { id: ingestionJob.namespace.id },
        data: {
          totalDocuments: { increment: documents.length },
          organization: {
            update: {
              totalDocuments: { increment: documents.length },
            },
          },
        },
        select: { id: true },
      });
    });

    const documentIdToWorkflowRunId = await context.run(
      "enqueue-documents",
      async () => {
        const documentIdToWorkflowRunIds = await triggerDocumentJob(
          documents.map((document) => ({
            documentId: document.id,
          })),
        );

        return documentIdToWorkflowRunIds.map((data, idx) => ({
          documentId: documents[idx]!.id,
          workflowRunId: data.workflowRunId,
        }));
      },
    );

    await context.run("update-status-processing", async () => {
      await db.ingestJob.update({
        where: { id: ingestionJob.id },
        data: {
          status: IngestJobStatus.PROCESSING,
          processingAt: new Date(),
        },
        select: { id: true },
      });
    });

    // update documents with workflowRunIds (in parallel)
    const batches = chunkArray(documentIdToWorkflowRunId, BATCH_SIZE);
    await Promise.all(
      batches.map((batch, i) =>
        context.run(`update-documents-with-workflowRunIds-${i}`, async () => {
          await db.$transaction(
            batch.map(({ documentId, workflowRunId }) =>
              db.document.update({
                where: { id: documentId },
                data: { workflowRunsIds: { push: workflowRunId } },
              }),
            ),
          );
        }),
      ),
    );
  },
  {
    failureFunction: async ({ context, failResponse }) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (context.requestPayload && context.requestPayload.jobId) {
        const { jobId } = context.requestPayload;

        await db.ingestJob.update({
          where: { id: jobId },
          data: {
            status: IngestJobStatus.FAILED,
            error: failResponse || "Unknown error",
            failedAt: new Date(),
          },
          select: { id: true },
        });
      }
    },
    qstashClient: qstashClient,
    receiver: qstashReceiver,
    flowControl: { key: "ingest-job", parallelism: 200, ratePerSecond: 100 },
  },
);
