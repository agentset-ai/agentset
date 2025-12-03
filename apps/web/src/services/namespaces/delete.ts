/**
 * Delete namespace
 *
 * Marks a namespace for deletion and triggers the deletion job.
 * Verifies user has admin/owner role in the organization (if session exists).
 * Public API routes use API key auth, so skip role check.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import { NamespaceStatus } from "@agentset/db";
import { triggerDeleteNamespace } from "@agentset/jobs";

import type { AgentsetContext } from "../shared/context";

export const deleteNamespace = async (
  context: AgentsetContext,
  input: { namespaceId: string },
) => {
  // Verify user has access and is admin/owner (only if session exists)
  // Public API routes authenticate via API key, so skip role check
  const namespace = await context.db.namespace.findFirst({
    where: {
      id: input.namespaceId,
      ...(context.session
        ? {
            organization: {
              members: {
                some: {
                  userId: context.session.user.id,
                  role: {
                    in: ["admin", "owner"],
                  },
                },
              },
            },
          }
        : {}),
      status: NamespaceStatus.ACTIVE,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!namespace) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Namespace not found or you don't have permission to delete it",
    });
  }

  await context.db.namespace.update({
    where: { id: namespace.id },
    data: { status: NamespaceStatus.DELETING },
  });

  await triggerDeleteNamespace({
    namespaceId: namespace.id,
  });

  return { success: true };
};
