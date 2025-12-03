/**
 * Get namespace onboarding status
 *
 * Returns the onboarding status for a namespace (whether user has completed
 * ingest documents, playground usage, and created API key).
 */

import { AgentsetApiError } from "@/lib/api/errors";

import { NamespaceStatus } from "@agentset/db";

import type { ProtectedAgentsetContext } from "../shared/context";

export const getOnboardingStatus = async (
  context: ProtectedAgentsetContext,
  input: { orgSlug: string; slug: string },
) => {
  const namespace = await context.db.namespace.findFirst({
    where: {
      slug: input.slug,
      organization: {
        slug: input.orgSlug,
        members: { some: { userId: context.session.user.id } },
      },
      status: NamespaceStatus.ACTIVE,
    },
    select: {
      totalIngestJobs: true,
      totalPlaygroundUsage: true,
      organization: {
        select: {
          apiKeys: {
            take: 1,
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!namespace) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Namespace not found",
    });
  }

  return {
    ingestDocuments: namespace.totalIngestJobs > 0,
    playground: namespace.totalPlaygroundUsage > 0,
    createApiKey: namespace.organization.apiKeys.length > 0,
  };
};
