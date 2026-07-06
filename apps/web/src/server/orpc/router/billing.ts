import type { ProtectedContext } from "@/server/orpc/base";
import { getBaseUrl } from "@/lib/utils";
import { protectedProcedure } from "@/server/orpc/base";
import { ORPCError, os } from "@orpc/server";
import { z } from "zod/v4";

import { db } from "@agentset/db/client";
import { stripe } from "@agentset/stripe";
import {
  getStripeEnvironment,
  isProPlan,
  PRO_PLAN_METERED,
} from "@agentset/stripe/plans";

/**
 * Port of the tRPC `organizationMiddleware`: input-dependent middleware that
 * verifies membership and injects `context.organization`.
 *
 * tRPC merged chained `.input()` calls, so `{ orgId }` was implicit on every
 * billing procedure; oRPC does NOT merge inputs, so each procedure's schema
 * includes `orgId` explicitly and applies this middleware AFTER `.input()` as
 * `.use(requireOrganization, (input) => input.orgId)`.
 */
const requireOrganization = os
  .$context<ProtectedContext>()
  .middleware(async ({ context, next }, orgId: string) => {
    const organization = await db.organization.findUnique({
      where: {
        id: orgId,
        members: { some: { userId: context.session.user.id } },
      },
      select: {
        id: true,
        slug: true,
        stripeId: true,
      },
    });

    if (!organization) {
      throw new ORPCError("NOT_FOUND", {
        message: "Organization not found",
      });
    }

    return next({
      context: {
        organization,
      },
    });
  });

const orgInputSchema = z.object({
  orgId: z.string(),
});

export const billingRouter = {
  upgrade: protectedProcedure
    .input(
      orgInputSchema.extend({
        plan: z.enum(["free", "pro"]),
        period: z.enum(["monthly", "yearly"]),
        baseUrl: z.string(),
      }),
    )
    .use(requireOrganization, (input) => input.orgId)
    .handler(async ({ context, input }) => {
      const { plan, period, baseUrl } = input;

      const planKey = plan.replace(" ", "+");
      const prices = await stripe.prices.list({
        lookup_keys: [`${planKey}_${period}`],
      });
      const priceId = prices.data[0]!.id;

      const activeSubscription = context.organization.stripeId
        ? await stripe.subscriptions
            .list({
              customer: context.organization.stripeId,
              status: "active",
            })
            .then((res) => res.data[0])
        : null;

      // if the user has an active subscription, create billing portal to upgrade
      if (context.organization.stripeId && activeSubscription) {
        const { url } = await stripe.billingPortal.sessions.create({
          customer: context.organization.stripeId,
          return_url: baseUrl,
          flow_data: {
            type: "subscription_update",
            subscription_update: {
              subscription: activeSubscription.id,
            },
          },
        });

        return { url };
      } else {
        // For both new users and users with canceled subscriptions
        const stripeSession = await stripe.checkout.sessions.create({
          ...(context.organization.stripeId
            ? {
                customer: context.organization.stripeId,
                // need to pass this or Stripe will throw an error: https://git.new/kX4fi6B
                customer_update: {
                  name: "auto",
                  address: "auto",
                },
              }
            : {
                customer_email: context.session.user.email,
              }),
          billing_address_collection: "required",
          success_url: `${getBaseUrl()}/${context.organization.slug}?upgraded=true&plan=${planKey}&period=${period}`,
          cancel_url: baseUrl,
          line_items: [
            { price: priceId, quantity: 1 },
            ...(isProPlan(plan)
              ? [
                  {
                    price:
                      PRO_PLAN_METERED[period].priceId[getStripeEnvironment()],
                  },
                ]
              : []),
          ],
          allow_promotion_codes: true,
          automatic_tax: {
            enabled: true,
          },
          tax_id_collection: {
            enabled: true,
          },
          mode: "subscription",
          client_reference_id: context.organization.id,
          metadata: {
            agentsetCustomerId: context.session.user.id,
          },
        });

        return { sessionId: stripeSession.id };
      }
    }),
  invoices: protectedProcedure
    .input(orgInputSchema)
    .use(requireOrganization, (input) => input.orgId)
    .handler(async ({ context }) => {
      if (!context.organization.stripeId) {
        return [];
      }

      try {
        const invoices = await stripe.invoices.list({
          customer: context.organization.stripeId,
        });

        return invoices.data.map((invoice) => {
          return {
            id: invoice.id,
            total: invoice.amount_paid,
            createdAt: new Date(invoice.created * 1000),
            description: "Agentset subscription",
            pdfUrl: invoice.invoice_pdf,
          };
        });
      } catch (error) {
        console.log(error);
        return [];
      }
    }),
  manage: protectedProcedure
    .input(orgInputSchema)
    .use(requireOrganization, (input) => input.orgId)
    .handler(async ({ context }) => {
      if (!context.organization.stripeId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No Stripe customer ID",
        });
      }

      try {
        const { url } = await stripe.billingPortal.sessions.create({
          customer: context.organization.stripeId,
          return_url: `${getBaseUrl()}/${context.organization.slug}/billing`,
        });
        return url;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        throw new ORPCError("BAD_REQUEST", {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          message: error?.raw?.message,
        });
      }
    }),
  getPaymentMethods: protectedProcedure
    .input(orgInputSchema)
    .use(requireOrganization, (input) => input.orgId)
    .handler(async ({ context }) => {
      if (!context.organization.stripeId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No Stripe customer ID",
        });
      }

      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: context.organization.stripeId,
        });

        // reorder to put ACH first
        const ach = paymentMethods.data.find(
          (method) => method.type === "us_bank_account",
        );

        return [
          ...(ach ? [ach] : []),
          ...paymentMethods.data.filter((method) => method.id !== ach?.id),
        ];
      } catch (error) {
        console.error(error);
        return [];
      }
    }),
  addPaymentMethod: protectedProcedure
    .input(
      orgInputSchema.extend({
        method: z.enum(["card", "us_bank_account"]).optional(),
      }),
    )
    .use(requireOrganization, (input) => input.orgId)
    .handler(async ({ context, input }) => {
      if (!context.organization.stripeId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No Stripe customer ID",
        });
      }

      if (!input.method) {
        const { url } = await stripe.billingPortal.sessions.create({
          customer: context.organization.stripeId,
          return_url: `${getBaseUrl()}/${context.organization.slug}/billing`,
          flow_data: {
            type: "payment_method_update",
          },
        });

        return url;
      }

      const { url } = await stripe.checkout.sessions.create({
        mode: "setup",
        customer: context.organization.stripeId,
        payment_method_types: [input.method],
        success_url: `${getBaseUrl()}/${context.organization.slug}/billing`,
        cancel_url: `${getBaseUrl()}/${context.organization.slug}/billing`,
      });

      return url;
    }),
  cancel: protectedProcedure
    .input(orgInputSchema)
    .use(requireOrganization, (input) => input.orgId)
    .handler(async ({ context }) => {
      if (!context.organization.stripeId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No Stripe customer ID",
        });
      }

      try {
        const activeSubscription = await stripe.subscriptions
          .list({
            customer: context.organization.stripeId,
            status: "active",
          })
          .then((res) => res.data[0]);

        if (!activeSubscription)
          throw new ORPCError("BAD_REQUEST", {
            message: "No active subscription",
          });

        const { url } = await stripe.billingPortal.sessions.create({
          customer: context.organization.stripeId,
          return_url: `${getBaseUrl()}/${context.organization.slug}/billing`,
          flow_data: {
            type: "subscription_cancel",
            subscription_cancel: {
              subscription: activeSubscription.id,
            },
          },
        });
        return url;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        throw new ORPCError("BAD_REQUEST", {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          message: error.raw.message,
        });
      }
    }),
};
