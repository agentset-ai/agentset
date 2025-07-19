import { meterDocumentsPages } from "@/lib/meters";
import { isProPlan } from "@/lib/plans";
import { schemaTask } from "@trigger.dev/sdk/v3";

import { DocumentStatus } from "@agentset/db";
import { chunkArray } from "@agentset/utils";

import {
  METER_ORG_DOCUMENTS_JOB_ID,
  meterOrgDocumentsBodySchema,
} from "../index";
import { getDb } from "./db";

const BATCH_SIZE = 100;

export const meterOrgDocuments = schemaTask({
  id: METER_ORG_DOCUMENTS_JOB_ID,
  maxDuration: 1800, // 30 minutes
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
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
    if (!isProPlan(organization.plan) || !stripeCustomerId) {
      // Not a pro plan or no stripe id, so we don't need to meter anything
      return {
        organizationId,
        metered: false,
        reason: "Not a pro plan or no Stripe customer ID",
      };
    }

    // Get all documents for the organization
    const documents = await db.document.findMany({
      where: {
        ingestJob: {
          namespace: {
            organizationId,
          },
        },
        status: {
          notIn: [DocumentStatus.DELETING, DocumentStatus.FAILED],
        },
        totalPages: {
          gt: 0,
        },
      },
      select: { id: true, totalPages: true },
    });

    if (documents.length === 0) {
      return {
        organizationId,
        metered: false,
        reason: "No documents to meter",
        documentsProcessed: 0,
      };
    }

    // Process documents in batches
    const batches = chunkArray(documents, BATCH_SIZE);
    let totalDocumentsProcessed = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!;

      await meterDocumentsPages({
        documents: batch,
        stripeCustomerId,
      });

      totalDocumentsProcessed += batch.length;
    }

    return {
      organizationId,
      metered: true,
      stripeCustomerId,
      documentsProcessed: totalDocumentsProcessed,
      batchesProcessed: batches.length,
    };
  },
});
