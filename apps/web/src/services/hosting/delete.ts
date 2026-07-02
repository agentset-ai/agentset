import { env } from "@/env";
import { AgentsetApiError } from "@/lib/api/errors";
import { removeDomain } from "@/services/domains/remove";
import { isVercelConfigured } from "@/services/domains/utils";
import { getCache, waitUntil } from "@vercel/functions";

import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";
import { deleteAsset } from "@agentset/storage";

export const deleteHosting = async ({
  namespaceId,
}: {
  namespaceId: string;
}) => {
  const hosting = await db.hosting.findFirst({
    where: { namespaceId },
    include: { domain: true },
  });

  if (!hosting) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Hosting is not enabled for this namespace",
    });
  }

  // remove the custom domain from the Vercel project before the db row cascades.
  // best-effort: a Vercel API failure must not block hosting deletion
  if (hosting.domain && isVercelConfigured()) {
    try {
      await removeDomain({ hostingId: hosting.id });
    } catch (error) {
      console.error(
        `Failed to remove domain ${hosting.domain.slug} from Vercel while deleting hosting ${hosting.id}`,
        error,
      );
    }
  }

  try {
    await db.hosting.delete({
      where: { id: hosting.id },
    });
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

  // Expire cache
  await getCache().expireTag(`hosting:${hosting.id}`);

  // Delete logo if it exists
  if (hosting.logo) {
    waitUntil(deleteAsset(hosting.logo.replace(`${env.ASSETS_S3_URL}/`, "")));
  }
};
