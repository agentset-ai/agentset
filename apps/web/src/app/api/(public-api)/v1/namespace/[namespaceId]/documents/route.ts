import { withNamespaceApiHandler } from "@/lib/api/handler";
import { normalizeId, prefixId } from "@/lib/api/ids";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { DocumentSchema, getDocumentsSchema } from "@/schemas/api/document";
import { getPaginationArgs, paginateResults } from "@/services/pagination";

import { db } from "@agentset/db/client";

export const GET = withNamespaceApiHandler(
  async ({ searchParams, namespace, tenantId, headers }) => {
    const query = await getDocumentsSchema.parseAsync(searchParams);

    // For backward pagination we scan in the opposite direction, then reverse results.
    const { where, ...paginationArgs } = getPaginationArgs(
      query,
      {
        orderBy: query.orderBy,
        order: query.order,
      },
      "doc_",
    );

    const documents = await db.document.findMany({
      where: {
        tenantId,
        namespaceId: namespace.id,
        ...(query.ingestJobId && {
          ingestJobId: normalizeId(query.ingestJobId, "job_"),
        }),
        ...(query.statuses &&
          query.statuses.length > 0 && { status: { in: query.statuses } }),
        ...where,
      },
      ...paginationArgs,
    });

    const paginated = paginateResults(
      query,
      documents.map((doc) =>
        DocumentSchema.parse({
          ...doc,
          ingestJobId: prefixId(doc.ingestJobId, "job_"),
          id: prefixId(doc.id, "doc_"),
        }),
      ),
    );

    return makeApiSuccessResponse({
      data: paginated.records,
      pagination: paginated.pagination,
      headers,
    });
  },
  { logging: { routeName: "GET /v1/namespace/[namespaceId]/documents" } },
);
