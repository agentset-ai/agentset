import type { updateNamespaceSchema } from "@/schemas/api/namespace";
import type { z } from "zod/v4";
import { revalidateTag } from "next/cache";
import { AgentsetApiError } from "@/lib/api/errors";

import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";

export const updateNamespace = async ({
  namespaceId,
  organizationId,
  data,
}: {
  namespaceId: string;
  organizationId: string;
  data: z.infer<typeof updateNamespaceSchema>;
}) => {
  const { name, slug } = data;

  try {
    const namespace = await db.namespace.update({
      where: {
        id: namespaceId,
      },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
      },
    });

    revalidateTag(`ns:${namespaceId}`, "max");
    revalidateTag(`org:${organizationId}`, "max");

    return namespace;
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
};
