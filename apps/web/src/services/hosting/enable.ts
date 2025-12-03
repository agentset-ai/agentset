/**
 * Enable hosting for a namespace
 *
 * Creates hosting configuration for a namespace with a unique slug.
 */

import { AgentsetApiError } from "@/lib/api/errors";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { nanoid } from "nanoid";

import type { AgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export const enableHosting = async (
  context: AgentsetContext,
  input: { namespaceId: string },
) => {
  const ns = await getNamespace(context, { id: input.namespaceId });

  const namespace = await context.db.namespace.findUnique({
    where: {
      id: ns.id,
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
  while ((await context.db.hosting.count({ where: { slug } })) > 0) {
    slug = `${namespace.slug}-${nanoid(10)}`;
  }

  return context.db.hosting.create({
    data: {
      namespaceId: namespace.id,
      title: namespace.name,
      slug,
      systemPrompt: DEFAULT_SYSTEM_PROMPT.compile(),
    },
  });
};
