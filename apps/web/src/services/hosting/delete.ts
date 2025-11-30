/**
 * Delete hosting configuration
 *
 * Deletes hosting configuration for a namespace and cleans up assets.
 */

import { env } from "@/env";
import { AgentsetApiError } from "@/lib/api/errors";
import { getCache, waitUntil } from "@vercel/functions";

import { Prisma } from "@agentset/db";
import { deleteAsset } from "@agentset/storage";

import type { AgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export const deleteHosting = async (
  context: AgentsetContext,
  input: { namespaceId: string },
) => {
  const namespace = await getNamespace(context, { id: input.namespaceId });

  try {
    const hosting = await context.db.hosting.delete({
      where: { namespaceId: namespace.id },
    });

    // Expire cache
    await getCache().expireTag(`hosting:${hosting.id}`);

    // Delete logo if it exists
    if (hosting.logo) {
      waitUntil(deleteAsset(hosting.logo.replace(`${env.ASSETS_S3_URL}/`, "")));
    }

    return { success: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "Hosting is not enabled for this namespace",
      });
    }
    throw error;
  }
};
