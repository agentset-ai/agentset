/**
 * Search Router
 *
 * Handles search operations.
 */

import { protectedProcedure } from "@/server/orpc/orpc";
import { search } from "@/services/search/search";
import { toProtectedAgentsetContext } from "@/services/shared/adapters";
import { z } from "zod/v4";

import { rerankerSchema } from "@agentset/validation";

const chunkExplorerInputSchema = z.object({
  namespaceId: z.string(),
  query: z.string().min(1),
  topK: z.number().min(1).max(100),
  rerank: z.boolean(),
  rerankModel: rerankerSchema,
  rerankLimit: z.number().min(1).max(100),
  filter: z.record(z.string(), z.any()).optional(),
});

export const searchRouter = {
  search: protectedProcedure
    .input(chunkExplorerInputSchema)
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await search(serviceContext, input);
    }),
};
