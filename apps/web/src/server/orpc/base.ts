import type { ApiKeyInfo } from "@/lib/api/api-key";
import type { Session } from "@/lib/auth-types";
import { getApiKeyInfo } from "@/lib/api/api-key";
import {
  AgentsetApiError,
  errorCodeToHttpStatus,
  handleApiError,
} from "@/lib/api/errors";
import { getNamespace } from "@/lib/api/handler/namespace";
import { ratelimit } from "@/lib/api/rate-limit";
import { tenantHeaderSchema } from "@/openapi/v1/utils";
import { ORPCError, os, ValidationError } from "@orpc/server";
import { z, ZodError } from "zod/v4";

import type { Namespace, Organization } from "@agentset/db";
import { normalizeId, tryCatch } from "@agentset/utils";

/**
 * ---------------------------------------------------------------------------
 * Public API surface (api.agentset.ai/v1) — org API-key auth
 * ---------------------------------------------------------------------------
 */

export type PublicOrganization = Pick<Organization, "id"> &
  ApiKeyInfo["organization"];

/**
 * Mutable bags on the initial context: middlewares write into them in place so
 * the route handler can read rate-limit headers / analytics identity after
 * `handler.handle()` returns (success or error).
 */
export interface PublicApiContext {
  headers: Headers;
  resHeaders: Record<string, string>;
  analytics: {
    organization?: PublicOrganization;
    tenantId?: string;
    namespaceId?: string;
    routeName?: string;
  };
}

const publicBase = os.$context<PublicApiContext>();

const getTenantFromHeaders = (headers: Headers) => {
  const tenantId = headers.get("x-tenant-id") ?? undefined;

  const parsedTenantId = tenantHeaderSchema.safeParse(tenantId);
  if (!parsedTenantId.success) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Invalid tenant ID.",
    });
  }

  return parsedTenantId.data;
};

/**
 * Port of `withApiHandler` (lib/api/handler/base.ts): loose Bearer parsing,
 * cached key lookup, per-org rate limit (headers attached to every response),
 * x-tenant-id validation. Error messages must stay byte-identical.
 */
const apiKeyAuthMiddleware = publicBase.middleware(
  async ({ context, next, procedure }) => {
    let apiKey: string | undefined = undefined;

    const authorizationHeader = context.headers.get("Authorization");
    if (authorizationHeader) {
      if (!authorizationHeader.includes("Bearer ")) {
        throw new AgentsetApiError({
          code: "bad_request",
          message:
            "Misconfigured authorization header. Did you forget to add 'Bearer '?",
        });
      }
      apiKey = authorizationHeader.replace("Bearer ", "");
    }

    if (!apiKey) {
      throw new AgentsetApiError({
        code: "unauthorized",
        message: "Unauthorized: Invalid API key.",
      });
    }

    const orgApiKey = await tryCatch(getApiKeyInfo(apiKey));
    if (!orgApiKey.data) {
      throw new AgentsetApiError({
        code: "unauthorized",
        message: "Unauthorized: Invalid API key.",
      });
    }

    const rateLimit = orgApiKey.data.organization.apiRatelimit;
    const { success, limit, reset, remaining } = await ratelimit(
      rateLimit,
      "1 m",
    ).limit(orgApiKey.data.organizationId);

    Object.assign(context.resHeaders, {
      "Retry-After": reset.toString(),
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    });

    if (!success) {
      throw new AgentsetApiError({
        code: "rate_limit_exceeded",
        message: "Too many requests.",
      });
    }

    const tenantId = getTenantFromHeaders(context.headers);
    const organization: PublicOrganization = {
      id: orgApiKey.data.organizationId,
      ...orgApiKey.data.organization,
    };

    const { method, path } = procedure["~orpc"].route;
    context.analytics.organization = organization;
    context.analytics.tenantId = tenantId;
    // keep the legacy `GET /v1/organization` / `POST /v1/namespace/[namespaceId]/chat` labels
    context.analytics.routeName = path
      ? `${method ?? "POST"} /v1${path.replace(/\{(\w+)\}/g, "[$1]")}`
      : undefined;

    return next({
      context: {
        organization,
        apiScope: orgApiKey.data.scope,
        tenantId,
      },
    });
  },
);

/** Base builder for public v1 procedures (org resolved, rate limited). */
export const publicApi = publicBase.use(apiKeyAuthMiddleware);

/**
 * Port of `withNamespaceApiHandler`: apply per procedure AFTER `.input()` as
 * `.use(requireNamespace, (input) => input.namespaceId)`.
 */
export const requireNamespace = os
  .$context<PublicApiContext & { organization: PublicOrganization }>()
  .middleware(async ({ context, next }, namespaceIdInput: string) => {
    const namespaceId = normalizeId(namespaceIdInput ?? "", "ns_");
    if (!namespaceId) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: "Invalid namespace ID.",
      });
    }

    const namespace = await getNamespace({
      namespaceId,
      organizationId: context.organization.id,
    });

    if (!namespace) {
      throw new AgentsetApiError({
        code: "unauthorized",
        message: "Unauthorized: You don't have access to this namespace.",
      });
    }

    context.analytics.namespaceId = namespace.id;

    return next({ context: { namespace: namespace as Namespace } });
  });

/** Success envelope — the response schema of every enveloped v1 endpoint. */
export const successSchema = <T extends z.ZodType>(
  data: T,
  { hasPagination }: { hasPagination?: boolean } = {},
) =>
  z.object({
    success: z.literal(true),
    data,
    ...(hasPagination && {
      pagination: z.object({
        nextCursor: z.string().nullable(),
        prevCursor: z.string().nullable(),
        hasMore: z.boolean(),
      }),
    }),
  });

/**
 * Legacy error mapping. Anything thrown inside a public procedure funnels
 * through here (as a client interceptor on the OpenAPIHandler) and is
 * re-thrown as an ORPCError whose status matches `errorCodeToHttpStatus` and
 * whose `data` carries the exact legacy body for the response encoder.
 */
export interface LegacyErrorBody {
  success: false;
  error: { code: string; message: string; doc_url?: string };
}

export const toLegacyErrorParts = (
  error: unknown,
): { status: number; body: LegacyErrorBody } => {
  let cause = error;

  // oRPC wraps input-validation failures; unwrap back into a ZodError so
  // handleApiError formats them as 422 with the zod-error message (parity
  // with the old `schema.parseAsync(body)` behavior).
  if (
    error instanceof ORPCError &&
    error.code === "BAD_REQUEST" &&
    error.cause instanceof ValidationError
  ) {
    cause = new ZodError(error.cause.issues as never);
  }

  const { error: legacyError, status } = handleApiError(cause);
  return { status, body: { success: false, error: legacyError } };
};

export const legacyErrorORPCError = (error: unknown) => {
  if (
    error instanceof ORPCError &&
    (error.data as LegacyErrorBody | undefined)?.success === false
  ) {
    return error; // already converted
  }

  const { status, body } = toLegacyErrorParts(error);
  return new ORPCError(body.error.code.toUpperCase(), {
    status,
    message: body.error.message,
    data: body,
  });
};

/** OpenAPIHandler option: emit the legacy error envelope as the body. */
export const legacyErrorResponseBodyEncoder = (
  error: ORPCError<string, unknown>,
): LegacyErrorBody => {
  const data = error.data as LegacyErrorBody | undefined;
  if (data?.success === false) return data;
  return toLegacyErrorParts(error).body;
};

/**
 * ---------------------------------------------------------------------------
 * Internal surface (dashboard RPC) — better-auth session
 * ---------------------------------------------------------------------------
 */

export interface InternalContext {
  headers: Headers;
  /** resolved once per HTTP request in the rpc route handler */
  session: Session | null;
}

const internalBase = os.$context<InternalContext>();

/**
 * Port of the tRPC `timingMiddleware`: timing log + AgentsetApiError → typed
 * transport error (dashboard mutations surface 4xx instead of 500).
 */
const timingMiddleware = internalBase.middleware(async ({ next, path }) => {
  const start = Date.now();

  try {
    const result = await next();

    const end = Date.now();
    console.log(`[RPC] ${path.join(".")} took ${end - start}ms to execute`);

    return result;
  } catch (error) {
    if (error instanceof AgentsetApiError) {
      throw new ORPCError(error.code.toUpperCase(), {
        status: errorCodeToHttpStatus[error.code],
        message: error.message,
      });
    }
    throw error;
  }
});

export const publicProcedure = internalBase.use(timingMiddleware);

export const protectedProcedure = publicProcedure.use(({ context, next }) => {
  if (!context.session) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session: context.session,
    },
  });
});

export type ProtectedContext = InternalContext & { session: Session };
