/**
 * Get all ingest jobs for a namespace
 *
 * Returns paginated list of ingest jobs with optional filtering.
 */

import type { getIngestionJobsSchema } from "@/schemas/api/ingest-job";
import type { z } from "zod/v4";
import { getPaginationArgs, paginateResults } from "@/services/pagination";

import type { ProtectedAgentsetContext } from "../shared/context";
import { getNamespace } from "../shared/namespace-access";

export const getAllIngestJobs = async (
  context: ProtectedAgentsetContext,
  input: z.infer<typeof getIngestionJobsSchema> & { namespaceId: string },
) => {
  await getNamespace(context, { id: input.namespaceId });

  const { where, ...paginationArgs } = getPaginationArgs(
    input,
    {
      orderBy: input.orderBy,
      order: input.order,
    },
    "job_",
  );

  const ingestJobs = await context.db.ingestJob.findMany({
    where: {
      namespaceId: input.namespaceId,
      ...(input.statuses &&
        input.statuses.length > 0 && {
          status: { in: input.statuses },
        }),
      ...where,
    },
    select: {
      id: true,
      status: true,
      name: true,
      tenantId: true,
      completedAt: true,
      failedAt: true,
      error: true,
      queuedAt: true,
      createdAt: true,
    },
    ...paginationArgs,
  });

  return paginateResults(input, ingestJobs);
};
