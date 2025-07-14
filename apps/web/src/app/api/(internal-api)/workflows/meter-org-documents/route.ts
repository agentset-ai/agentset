import type { MeterOrgDocumentsBody } from "@/lib/workflow";
import { chunkArray } from "@/lib/functions";
import { meterDocumentsPages } from "@/lib/meters";
import { isProPlan } from "@/lib/plans";
import { qstashClient, qstashReceiver } from "@/lib/workflow";
import { serve } from "@upstash/workflow/nextjs";

import { db, DocumentStatus } from "@agentset/db";

const BATCH_SIZE = 100;

export const { POST } = serve<MeterOrgDocumentsBody>(
  async (context) => {
    const { organizationId } = context.requestPayload;

    const organization = await context.run("get-organization", async () => {
      const org = await db.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          stripeId: true,
          plan: true,
        },
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      return org;
    });

    const stripeCustomerId = organization.stripeId;
    if (!isProPlan(organization.plan) || !stripeCustomerId) {
      // Not a pro plan or no stripe id, so we don't need to meter anything
      return;
    }

    // TODO: paginate this request
    const documents = await context.run("get-documents", async () => {
      return db.document.findMany({
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
    });

    const batches = chunkArray(documents, BATCH_SIZE);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!;
      await context.run(`meter-org-documents-${i}`, async () => {
        await meterDocumentsPages({
          documents: batch,
          stripeCustomerId: stripeCustomerId,
        });
      });
    }
  },
  {
    qstashClient: qstashClient,
    receiver: qstashReceiver,
    flowControl: {
      key: "meter-org-documents",
      parallelism: 200,
      ratePerSecond: 100,
    },
  },
);
