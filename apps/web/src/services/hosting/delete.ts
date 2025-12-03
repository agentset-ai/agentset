import { env } from "@/env";
import { AgentsetApiError } from "@/lib/api/errors";
import { getCache, waitUntil } from "@vercel/functions";

import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";
import { deleteAsset } from "@agentset/storage";

export const deleteHosting = async ({
  namespaceId,
}: {
  namespaceId: string;
}) => {
  try {
    const hosting = await db.hosting.delete({
      where: { namespaceId },
    });

    // Expire cache
    await getCache().expireTag(`hosting:${hosting.id}`);

    // Delete logo if it exists
    if (hosting.logo) {
      waitUntil(deleteAsset(hosting.logo.replace(`${env.ASSETS_S3_URL}/`, "")));
    }
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
