import type { PublicApiContext } from "@/server/orpc/base";
import type { NextRequest } from "next/server";
import {
  flushServerEvents,
  identifyOrganization,
  logServerEvent,
} from "@/lib/analytics-server";
import {
  legacyErrorORPCError,
  legacyErrorResponseBodyEncoder,
} from "@/server/orpc/base";
import { publicRouter } from "@/server/orpc/public/router";
import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

export const preferredRegion = "iad1"; // make this closer to the DB
export const maxDuration = 120;

const handler = new OpenAPIHandler<PublicApiContext>(publicRouter, {
  plugins: [
    new SmartCoercionPlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  clientInterceptors: [
    async (options) => {
      try {
        return await options.next();
      } catch (error) {
        console.error(error);
        throw legacyErrorORPCError(error);
      }
    },
  ],
  customErrorResponseBodyEncoder: legacyErrorResponseBodyEncoder,
});

const notFoundResponse = () =>
  Response.json(
    {
      success: false,
      error: {
        code: "not_found",
        message: "The requested endpoint does not exist.",
        doc_url: "https://docs.agentset.ai/api-reference",
      },
    },
    { status: 404 },
  );

async function handleRequest(request: NextRequest) {
  const context: PublicApiContext = {
    headers: request.headers,
    resHeaders: {},
    analytics: {},
  };

  const { response } = await handler.handle(request, {
    prefix: "/api/v1",
    context,
  });

  if (!response) return notFoundResponse();

  for (const [key, value] of Object.entries(context.resHeaders)) {
    response.headers.set(key, value);
  }

  // parity with the legacy wrappers: successful requests are logged, errors
  // (thrown before the old logging call) are not
  const { organization, tenantId, namespaceId, routeName } = context.analytics;
  if (organization && routeName && response.status < 400) {
    identifyOrganization(organization);
    logServerEvent(
      "api_request",
      { request, routeName, response, organization },
      { tenantId, ...(namespaceId ? { namespaceId } : {}) },
    );
    flushServerEvents();
  }

  return response;
}

export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as PUT,
  handleRequest as PATCH,
  handleRequest as DELETE,
  handleRequest as HEAD,
};
