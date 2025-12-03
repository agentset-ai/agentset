/**
 * Get ingest job configuration
 *
 * Returns the configuration for a specific ingest job.
 */

import { AgentsetApiError } from "@/lib/api/errors";

import type { ProtectedAgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export const getIngestJobConfig = async (
  context: ProtectedAgentsetContext,
  input: { jobId: string; namespaceId: string },
) => {
  await getNamespace(context, { id: input.namespaceId });

  const ingestJob = await context.db.ingestJob.findUnique({
    where: {
      id: input.jobId,
      namespaceId: input.namespaceId,
    },
    select: {
      config: true,
    },
  });

  if (!ingestJob) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Ingest job not found",
    });
  }

  return ingestJob.config;
};
