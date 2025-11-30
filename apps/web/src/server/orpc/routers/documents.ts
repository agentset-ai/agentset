/**
 * Documents Router
 *
 * Handles document management operations.
 */

import { getDocumentsSchema } from "@/schemas/api/document";
import { protectedProcedure } from "@/server/orpc/orpc";
import { deleteDocument } from "@/services/documents/delete";
import { getAllDocuments } from "@/services/documents/getAll";
import { toProtectedAgentsetContext } from "@/services/shared/adapters";
import { z } from "zod/v4";

export const documentsRouter = {
  all: protectedProcedure
    .input(
      getDocumentsSchema.extend({
        namespaceId: z.string(),
        ingestJobId: z.string().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getAllDocuments(serviceContext, input);
    }),
  delete: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        namespaceId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await deleteDocument(serviceContext, input);
    }),
};
