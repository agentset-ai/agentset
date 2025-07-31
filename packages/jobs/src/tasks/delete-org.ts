import { schemaTask } from "@trigger.dev/sdk";

import { chunkArray } from "@agentset/utils";

import { getDb } from "../db";
import {
  DELETE_ORGANIZATION_JOB_ID,
  deleteOrganizationBodySchema,
} from "../schema";
import { deleteNamespace } from "./delete-namespace";

const BATCH_SIZE = 30;

export const deleteOrganization = schemaTask({
  id: DELETE_ORGANIZATION_JOB_ID,
  maxDuration: 1800, // 30 minutes
  queue: {
    concurrencyLimit: 50,
  },
  schema: deleteOrganizationBodySchema,
  run: async ({ organizationId }) => {
    const db = getDb();

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
      },
    });

    if (!organization) {
      return {
        organizationId,
        deleted: false,
        reason: "Organization not found",
      };
    }

    // Get all ingest jobs for this namespace
    const namespaces = await db.namespace.findMany({
      where: { organizationId },
      select: { id: true },
    });

    // Trigger ingest job deletion tasks (parent-child pattern)
    if (namespaces.length > 0) {
      const batches = chunkArray(namespaces, BATCH_SIZE);

      for (const batch of batches) {
        await deleteNamespace.batchTriggerAndWait(
          batch.map((namespace) => ({
            payload: {
              namespaceId: namespace.id,
            },
            options: {
              tags: [`ns_${namespace.id}`],
            },
          })),
        );
      }
    }

    // Delete the namespace directly
    await db.organization.delete({
      where: { id: organization.id },
      select: { id: true },
    });

    return {
      organizationId: organization.id,
      deleted: true,
    };
  },
});
