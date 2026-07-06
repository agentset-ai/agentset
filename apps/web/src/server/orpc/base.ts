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
import { auth } from "@/lib/auth";
import { tenantHeaderSchema } from "@/schemas/api/params";
import { ORPCError, os, ValidationError } from "@orpc/server";
import { z, ZodError } from "zod/v4";

import type { Organization } from "@agentset/db";
import { db } from "@agentset/db/client";
import { normalizeId, tryCatch } from "@agentset/utils";

/**
 * ---------------------------------------------------------------------------
 * One router, two credentials.
 *
 * Every procedure in the app router runs on the same initial context. The
 * `api` builder authenticates conditionally: an `Authorization` header means
 * org API-key auth (public REST / MCP semantics: rate limit, tenant header,
 * analytics identity), no header means a better-auth session (dashboard)
 * scoped to the organization named by the `x-organization-id` header.
 * Dashboard-only procedures use `protectedProcedure` (session required, no
 * org resolution) and never carry OpenAPI route metadata, which keeps them
 * off the public REST surface, the generated spec, and the MCP toolset.
 * ---------------------------------------------------------------------------
 */

export type PublicOrganization = Pick<Organization, "id"> &
  ApiKeyInfo["organization"];

export type MemberRole = "owner" | "admin" | "member";

export type ApiAuth =
  | { type: "apiKey"; scope: string }
  | { type: "session"; session: Session; memberRole: MemberRole };

/**
 * Mutable bags on the initial context: middlewares write into them in place so
 * the route handler can read rate-limit headers / analytics identity after
 * `handler.handle()` returns (success or error).
 */
export interface ApiContext {
  /**
   * Per-request headers. Filled by `RequestHeadersPlugin` on both route
   * handlers so batched dashboard calls see their own per-item headers; the
   * MCP bridge passes them explicitly.
   */
  reqHeaders?: Headers;
  resHeaders: Record<string, string>;
  analytics: {
    organization?: PublicOrganization;
    tenantId?: string;
    namespaceId?: string;
    routeName?: string;
  };
  /**
   * Session pre-resolved once per HTTP request by the dashboard rpc route
   * (shared across batched procedure calls). `undefined` means "not resolved
   * yet" — the auth middleware falls back to `auth.api.getSession`.
   */
  session?: Session | null;
}

export const ORG_HEADER = "x-organization-id";

const base = os.$context<ApiContext>();

const headersOf = (context: ApiContext) => context.reqHeaders ?? new Headers();

export const resolveSession = async (
  context: ApiContext,
): Promise<Session | null> =>
  context.session !== undefined
    ? context.session
    : auth.api.getSession({ headers: headersOf(context) });

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

/** Field parity with `ApiKeyInfo["organization"]` (lib/api/api-key.ts). */
const organizationSelect = {
  id: true,
  name: true,
  plan: true,
  apiRatelimit: true,
  searchLimit: true,
  searchUsage: true,
  totalPages: true,
  pagesLimit: true,
} as const;

/**
 * The conditional auth middleware.
 *
 * API-key branch: byte-parity port of the legacy `withApiHandler`
 * (lib/api/handler/base.ts): loose Bearer parsing, cached key lookup, per-org
 * rate limit (headers attached to every response), x-tenant-id validation.
 * Error messages must stay byte-identical — including the keyless 401, which
 * the session branch reuses when no session exists either.
 *
 * Session branch: better-auth session + `x-organization-id` header (raw or
 * org_-prefixed id), membership-checked and hydrated to the same
 * `PublicOrganization` shape the key lookup provides. No rate limit (parity
 * with the old dashboard router) and no analytics identity (the v1 route only
 * logs API-key traffic).
 */
const conditionalAuthMiddleware = base.middleware(
  async ({ context, next, procedure }) => {
    const headers = headersOf(context);
    const authorizationHeader = headers.get("Authorization");

    if (authorizationHeader) {
      if (!authorizationHeader.includes("Bearer ")) {
        throw new AgentsetApiError({
          code: "bad_request",
          message:
            "Misconfigured authorization header. Did you forget to add 'Bearer '?",
        });
      }
      const apiKey = authorizationHeader.replace("Bearer ", "");

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

      const tenantId = getTenantFromHeaders(headers);
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
          auth: {
            type: "apiKey",
            scope: orgApiKey.data.scope,
          } satisfies ApiAuth as ApiAuth,
          organization,
          apiScope: orgApiKey.data.scope,
          tenantId,
        },
      });
    }

    const session = await resolveSession(context);
    if (!session) {
      throw new AgentsetApiError({
        code: "unauthorized",
        message: "Unauthorized: Invalid API key.",
      });
    }

    const orgHeader = headers.get(ORG_HEADER);
    if (!orgHeader) {
      throw new AgentsetApiError({
        code: "bad_request",
        message: `Missing ${ORG_HEADER} header.`,
      });
    }

    // the header carries the raw organization id — it's a dashboard-internal
    // contract (the client always has the raw id from the session bootstrap),
    // so no org_ prefix normalization happens here
    const member = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: orgHeader,
      },
      select: {
        role: true,
        organization: { select: organizationSelect },
      },
    });

    if (!member) {
      throw new AgentsetApiError({
        code: "unauthorized",
        message: "Unauthorized: You don't have access to this organization.",
      });
    }

    const tenantId = getTenantFromHeaders(headers);

    return next({
      context: {
        auth: {
          type: "session",
          session,
          memberRole: member.role as MemberRole,
        } satisfies ApiAuth as ApiAuth,
        organization: member.organization,
        apiScope: "all",
        tenantId,
      },
    });
  },
);

/**
 * Base builder for the shared (REST + MCP + dashboard) procedures: org
 * resolved from either credential, rate limited on the API-key path.
 */
export const api = base.use(conditionalAuthMiddleware);

/**
 * Role gate for shared mutations. API keys act with full org authority
 * (parity with the public REST surface, where the key itself is the
 * credential); session members must hold one of the given roles — parity
 * with the old dashboard-only procedures.
 */
export const requireRoles = (...roles: MemberRole[]) =>
  os
    .$context<ApiContext & { auth: ApiAuth }>()
    .middleware(({ context, next }) => {
      if (
        context.auth.type === "session" &&
        !roles.includes(context.auth.memberRole)
      ) {
        throw new AgentsetApiError({
          code: "unauthorized",
          message:
            "Unauthorized: You don't have permission to perform this action.",
        });
      }

      return next();
    });

/**
 * Port of `withNamespaceApiHandler`: apply per procedure AFTER `.input()` as
 * `.use(requireNamespace, (input) => input.namespaceId)`. Membership was
 * already verified by the auth middleware, so the org-ownership check is the
 * same for both credentials.
 */
export const requireNamespace = os
  .$context<ApiContext & { organization: PublicOrganization }>()
  .middleware(async ({ context, next }, namespaceIdInput: string) => {
    const namespaceId = normalizeId(namespaceIdInput, "ns_");
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

    return next({ context: { namespace } });
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
 * Legacy error mapping. Anything thrown inside a shared procedure funnels
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
 * Dashboard RPC surface counterpart of the legacy encoder: business errors
 * become typed transport errors (4xx with a message instead of 500). Applied
 * as a client interceptor on the RPCHandler.
 */
export const toDashboardORPCError = (error: unknown): unknown => {
  if (error instanceof AgentsetApiError) {
    return new ORPCError(error.code.toUpperCase(), {
      status: errorCodeToHttpStatus[error.code],
      message: error.message,
    });
  }
  return error;
};

/**
 * ---------------------------------------------------------------------------
 * Dashboard-only procedures — better-auth session, no org header contract.
 * These never carry `.route()` metadata: no REST path, no OpenAPI entry, no
 * MCP tool.
 * ---------------------------------------------------------------------------
 */

export const protectedProcedure = base.use(async ({ context, next }) => {
  const session = await resolveSession(context);

  if (!session) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session,
    },
  });
});

export type ProtectedContext = ApiContext & { session: Session };

/**
 * Shared membership check for dashboard-only procedures (replaces the
 * per-router `validateIsMember`/inline `db.member.findFirst` copies). Role
 * failures and missing membership throw the same codes the old internal
 * routers used; pass `onMissing: "NOT_FOUND"` where that was the legacy
 * behavior (hosting, billing).
 */
export const requireMember = async (
  session: Session,
  org: { id: string } | { slug: string },
  opts?: { roles?: MemberRole[]; onMissing?: "UNAUTHORIZED" | "NOT_FOUND" },
) => {
  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organization: "id" in org ? { id: org.id } : { slug: org.slug },
    },
    select: {
      id: true,
      role: true,
      organizationId: true,
      organization: {
        select: { id: true, slug: true, plan: true, stripeId: true },
      },
    },
  });

  if (!member) {
    throw new ORPCError(opts?.onMissing ?? "UNAUTHORIZED");
  }

  if (opts?.roles && !opts.roles.includes(member.role as MemberRole)) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return member;
};
