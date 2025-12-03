import { AgentsetApiError } from "@/lib/api/errors";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { nanoid } from "nanoid";

import { db } from "@agentset/db/client";

export const enableHosting = async ({
  namespaceId,
}: {
  namespaceId: string;
}) => {
  const namespace = await db.namespace.findUnique({
    where: {
      id: namespaceId,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      hosting: { select: { id: true } },
    },
  });

  if (!namespace) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Namespace not found",
    });
  }

  if (namespace.hosting) {
    throw new AgentsetApiError({
      code: "conflict",
      message: "Hosting is already enabled for this namespace",
    });
  }

  let slug = `${namespace.slug}-${nanoid(10)}`;
  while ((await db.hosting.count({ where: { slug } })) > 0) {
    slug = `${namespace.slug}-${nanoid(10)}`;
  }

  return db.hosting.create({
    data: {
      namespaceId: namespace.id,
      title: namespace.name,
      slug,
      systemPrompt: DEFAULT_SYSTEM_PROMPT.compile(),
    },
  });
};
