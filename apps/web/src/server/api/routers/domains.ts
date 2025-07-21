import type { ProtectedProcedureContext } from "@/server/api/trpc";
import { addDomainToVercel } from "@/lib/domains/add-domain";
import { getConfigResponse } from "@/lib/domains/get-config-response";
import { getDomainResponse } from "@/lib/domains/get-domain-response";
import { removeDomainFromVercel } from "@/lib/domains/remove-domain";
import { validateDomain } from "@/lib/domains/utils";
import { verifyDomain } from "@/lib/domains/verify-domain";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { Domain } from "@agentset/db";

const commonInput = z.object({
  namespaceId: z.string(),
});

export type DomainVerificationStatusProps =
  | "Valid Configuration"
  | "Invalid Configuration"
  | "Conflicting DNS Records"
  | "Pending Verification"
  | "Domain Not Found"
  | "Unknown Error";

const getHosting = async (
  ctx: ProtectedProcedureContext,
  input: z.infer<typeof commonInput>,
) => {
  const hosting = await ctx.db.hosting.findFirst({
    where: {
      namespace: {
        id: input.namespaceId,
        organization: {
          members: { some: { userId: ctx.session.user.id } },
        },
      },
    },
  });

  return hosting ?? null;
};

export const domainsRouter = createTRPCRouter({
  add: protectedProcedure
    .input(commonInput.extend({ domain: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hosting = await getHosting(ctx, input);
      if (!hosting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Hosting not found",
        });
      }

      // get domain from hosting
      const domain = await ctx.db.domain.findUnique({
        where: {
          hostingId: hosting.id,
        },
      });

      if (domain) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already set a domain",
        });
      }

      const validDomain = await validateDomain(input.domain);

      if (validDomain.error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validDomain.error,
        });
      }

      const vercelResponse = await addDomainToVercel(input.domain);
      if (
        vercelResponse.error &&
        vercelResponse.error.code !== "domain_already_in_use" // ignore this error
      ) {
        throw new TRPCError({
          code: "UNPROCESSABLE_CONTENT",
          message: vercelResponse.error.message,
        });
      }

      return ctx.db.domain.create({
        data: {
          hostingId: hosting.id,
          slug: input.domain,
        },
      });
    }),
  checkStatus: protectedProcedure
    .input(commonInput)
    .query(async ({ ctx, input }) => {
      const hosting = await getHosting(ctx, input);
      if (!hosting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Hosting not found",
        });
      }

      const domain = await ctx.db.domain.findUnique({
        where: {
          hostingId: hosting.id,
        },
      });

      if (!domain) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found" });
      }

      let status: DomainVerificationStatusProps = "Valid Configuration";

      const [domainJson, configJson] = await Promise.all([
        getDomainResponse(domain.slug),
        getConfigResponse(domain.slug),
      ]);

      if (domainJson.error?.code === "not_found") {
        // domain not found on Vercel project
        status = "Domain Not Found";
        return {
          status,
          response: { configJson, domainJson },
        };
      } else if (domainJson.error) {
        status = "Unknown Error";
        return {
          status,
          response: { configJson, domainJson },
        };
      }

      /**
       * Domain has DNS conflicts
       */
      if (configJson.conflicts && configJson.conflicts.length > 0) {
        status = "Conflicting DNS Records";
        return {
          status,
          response: { configJson, domainJson },
        };
      }

      /**
       * If domain is not verified, we try to verify now
       */
      if (!domainJson.verified) {
        status = "Pending Verification";
        const verificationJson = await verifyDomain(domain.slug);
        if (verificationJson.verified) {
          /**
           * Domain was just verified
           */
          status = "Valid Configuration";
        }

        return {
          status,
          response: { configJson, domainJson, verificationJson },
        };
      }

      let prismaResponse: Domain | null = null;
      if (!configJson.misconfigured) {
        prismaResponse = await ctx.db.domain.update({
          where: {
            id: domain.id,
          },
          data: {
            verified: true,
            lastChecked: new Date(),
          },
        });
      } else {
        status = "Invalid Configuration";
        prismaResponse = await ctx.db.domain.update({
          where: {
            id: domain.id,
          },
          data: {
            verified: false,
            lastChecked: new Date(),
          },
        });
      }

      return {
        status,
        response: { configJson, domainJson, prismaResponse },
      };
    }),
  remove: protectedProcedure
    .input(commonInput)
    .mutation(async ({ ctx, input }) => {
      const hosting = await getHosting(ctx, input);
      if (!hosting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Hosting not found",
        });
      }

      const domain = await ctx.db.domain.findUnique({
        where: {
          hostingId: hosting.id,
        },
      });

      if (!domain) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Domain not found",
        });
      }

      const vercelResponse = await removeDomainFromVercel(domain.slug);
      // ignore not_found error
      if (vercelResponse.error && vercelResponse.error.code !== "not_found") {
        throw new TRPCError({
          code: "UNPROCESSABLE_CONTENT",
          message: vercelResponse.error.message,
        });
      }

      return ctx.db.domain.delete({
        where: {
          id: domain.id,
        },
      });
    }),
});
