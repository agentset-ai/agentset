/**
 * Get hosting configuration
 *
 * Returns hosting configuration for a namespace.
 */

import type { AgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export const getHosting = async (
  context: AgentsetContext,
  input: { namespaceId: string },
) => {
  const namespace = await getNamespace(context, { id: input.namespaceId });

  return await context.db.hosting.findFirst({
    where: {
      namespaceId: namespace.id,
    },
    include: {
      domain: true,
    },
  });
};
