import { schemaTask } from "@trigger.dev/sdk";

import { DocumentStatus, Prisma } from "@agentset/db";
import {
  createMeterEventSessionToken,
  meterDocumentsPages,
} from "@agentset/stripe";
import { isFreePlan } from "@agentset/stripe/plans";

import { getDb } from "../db";
import {
  METER_ORG_DOCUMENTS_JOB_ID,
  meterOrgDocumentsBodySchema,
} from "../schema";

const BATCH_SIZE = 300;

export const meterOrgDocuments = schemaTask({
  id: METER_ORG_DOCUMENTS_JOB_ID,
  maxDuration: 1800, // 30 minutes
  queue: {
    concurrencyLimit: 50,
  },
  schema: meterOrgDocumentsBodySchema,
  run: async ({ organizationId }) => {
    const db = getDb();

    // Get organization configuration
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        stripeId: true,
        plan: true,
      },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    const stripeCustomerId = organization.stripeId;
    if (isFreePlan(organization.plan) || !stripeCustomerId) {
      // Not a pro plan or no stripe id, so we don't need to meter anything
      return {
        organizationId,
        metered: false,
        reason: "Not a pro plan or no Stripe customer ID",
      };
    }

    const namespaces = await db.namespace.findMany({
      where: { organizationId },
      select: { id: true },
    });

    // Get all documents for the organization
    let totalDocumentsProcessed = 0;
    let totalPagesProcessed = 0;
    const token = await createMeterEventSessionToken();

    for (const namespace of namespaces) {
      let cursor: { id: string; createdAt: Date } | null = null;
      const sortOrder = "desc";
      const sort = [
        { createdAt: sortOrder },
        { id: sortOrder },
      ] satisfies Prisma.DocumentOrderByWithRelationInput[];
      const operation = sortOrder === "desc" ? "lt" : "gt";

      do {
        const documents = await db.document.findMany({
          where: {
            namespaceId: namespace.id,
            status: { notIn: [DocumentStatus.DELETING, DocumentStatus.FAILED] },
            totalPages: { gt: 0 },
            ...(cursor
              ? {
                  OR: [
                    { createdAt: { [operation]: new Date(cursor.createdAt) } },
                    {
                      AND: [
                        { createdAt: new Date(cursor.createdAt) },
                        {
                          id: {
                            [operation]: cursor.id,
                          },
                        },
                      ],
                    },
                  ],
                }
              : {}),
          },
          orderBy: sort,
          select: { id: true, totalPages: true, createdAt: true },
          take: BATCH_SIZE + 1,
        });

        const hasMore = documents.length > BATCH_SIZE;
        const last = documents.at(-1) as
          | { id: string; createdAt: Date }
          | undefined;
        const items = hasMore ? documents.slice(0, BATCH_SIZE) : documents;

        if (hasMore && last) {
          cursor = { id: last.id, createdAt: last.createdAt };
        } else {
          cursor = null;
        }

        if (items.length > 0) {
          await meterDocumentsPages({
            documents: items.map((document) => ({
              id: document.id,
              totalPages: document.totalPages,
            })),
            stripeCustomerId,
            token,
          });

          totalDocumentsProcessed += items.length;
          totalPagesProcessed += items.reduce(
            (acc, document) => acc + document.totalPages,
            0,
          );
        }
      } while (!!cursor);
    }

    if (totalDocumentsProcessed === 0) {
      return {
        organizationId,
        metered: false,
        reason: "No documents to meter",
        documentsProcessed: 0,
      };
    }

    return {
      organizationId,
      metered: true,
      stripeCustomerId,
      documentsProcessed: totalDocumentsProcessed,
      pagesProcessed: totalPagesProcessed,
    };
  },
});
