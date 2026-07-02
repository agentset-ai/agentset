import { AgentsetApiError } from "@/lib/api/errors";
import { withNamespaceApiHandler } from "@/lib/api/handler/namespace";
import { makeApiSuccessResponse } from "@/lib/api/response";
import { parseRequestBody } from "@/lib/api/utils";
import {
  addDomainSchema,
  DomainSchema,
  DomainStatusSchema,
} from "@/schemas/api/hosting";
import { addDomain } from "@/services/domains/add";
import { checkDomainStatus } from "@/services/domains/check-status";
import { removeDomain } from "@/services/domains/remove";
import { getHosting } from "@/services/hosting/get";

const getHostingOrThrow = async (namespaceId: string) => {
  const hosting = await getHosting({ namespaceId });

  if (!hosting) {
    throw new AgentsetApiError({
      code: "not_found",
      message: "Hosting is not enabled for this namespace.",
    });
  }

  return hosting;
};

export const GET = withNamespaceApiHandler(
  async ({ namespace, headers }) => {
    const hosting = await getHostingOrThrow(namespace.id);

    if (!hosting.domain) {
      throw new AgentsetApiError({
        code: "not_found",
        message: "No custom domain is set for this namespace.",
      });
    }

    const { status, response } = await checkDomainStatus({
      hostingId: hosting.id,
    });

    return makeApiSuccessResponse({
      // the Vercel responses omit fields when the domain is not found,
      // the schema defaults fill those in
      data: DomainStatusSchema.parse({
        domain: hosting.domain.slug,
        status,
        verified: status === "Valid Configuration",
        apexName: response.domainJson.apexName,
        verification: response.domainJson.verification,
        conflicts: response.configJson.conflicts,
        misconfigured: response.configJson.misconfigured,
      }),
      headers,
    });
  },
  { logging: { routeName: "GET /v1/namespace/[namespaceId]/hosting/domain" } },
);

export const POST = withNamespaceApiHandler(
  async ({ namespace, headers, req }) => {
    const body = await addDomainSchema.parseAsync(await parseRequestBody(req));
    const hosting = await getHostingOrThrow(namespace.id);

    const domain = await addDomain({
      hostingId: hosting.id,
      domain: body.domain,
    });

    return makeApiSuccessResponse({
      data: DomainSchema.parse(domain),
      headers,
      status: 201,
    });
  },
  { logging: { routeName: "POST /v1/namespace/[namespaceId]/hosting/domain" } },
);

export const DELETE = withNamespaceApiHandler(
  async ({ namespace, headers }) => {
    const hosting = await getHostingOrThrow(namespace.id);
    await removeDomain({ hostingId: hosting.id });

    return new Response(null, { status: 204, headers });
  },
  {
    logging: {
      routeName: "DELETE /v1/namespace/[namespaceId]/hosting/domain",
    },
  },
);
