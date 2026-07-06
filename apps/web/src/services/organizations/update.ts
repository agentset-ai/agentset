import { revalidateTag } from "next/cache";
import { AgentsetApiError } from "@/lib/api/errors";
import { waitUntil } from "@vercel/functions";

import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";

export const updateOrganization = async ({
  organizationId,
  name,
  slug,
}: {
  organizationId: string;
  name?: string;
  slug?: string;
}) => {
  let organization;
  try {
    organization = await db.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        createdAt: true,
        searchUsage: true,
        searchLimit: true,
        totalPages: true,
        pagesLimit: true,
        apiRatelimit: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AgentsetApiError({
        code: "conflict",
        message: `The slug "${slug}" is already in use.`,
      });
    }

    throw error;
  }

  // the api key cache embeds organization fields, so expire it along with the org tag
  waitUntil(
    (async () => {
      revalidateTag(`org:${organizationId}`, "max");

      const apiKeys = await db.organizationApiKey.findMany({
        where: {
          organizationId,
        },
        select: {
          key: true,
        },
      });

      for (const apiKey of apiKeys) {
        revalidateTag(`apiKey:${apiKey.key}`, "max");
      }
    })(),
  );

  return organization;
};
