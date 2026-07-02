import { withNamespaceApiHandler } from "@/lib/api/handler";
import { makeApiSuccessResponse } from "@/lib/api/response";
import {
  checkSearchLimit,
  incrementOrganizationSearchUsage,
} from "@/lib/api/usage";
import { parseRequestBody } from "@/lib/api/utils";
import { queryVectorStoreSchema } from "@/schemas/api/query";
import { searchNamespace } from "@/services/search";

export const preferredRegion = "iad1"; // make this closer to the DB

export const POST = withNamespaceApiHandler(
  async ({ req, namespace, tenantId, organization, headers }) => {
    // TODO: set hard limits to prevent abuse
    checkSearchLimit(organization);

    const body = await queryVectorStoreSchema.parseAsync(
      await parseRequestBody(req),
    );

    const results = await searchNamespace({
      namespace,
      tenantId,
      options: body,
    });

    incrementOrganizationSearchUsage(organization.id, 1);

    return makeApiSuccessResponse({
      data: results,
      headers,
    });
  },
  { logging: { routeName: "POST /v1/namespace/[namespaceId]/search" } },
);
