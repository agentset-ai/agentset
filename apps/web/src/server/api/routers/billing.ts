import { getBaseUrl } from "@/lib/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { stripe } from "@agentset/stripe";
import {
  getStripeEnvironment,
  isProPlan,
  PRO_PLAN_METERED,
} from "@agentset/stripe/plans";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const organizationMiddleware = protectedProcedure
  .input(
    z.object({
      orgId: z.string(),
    }),
  )
  .use(async ({ ctx, next, input }) => {
    const organization = await ctx.db.organization.findUnique({
      where: {
        id: input.orgId,
        members: { some: { userId: ctx.session.user.id } },
      },
      select: {
        id: true,
        slug: true,
        stripeId: true,
      },
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    return next({
      ctx: {
        ...ctx,
        organization,
      },
    });
  });

export const billingRouter = createTRPCRouter({
  getCurrentPlan: organizationMiddleware.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: {
        id: ctx.organization.id,
      },
      select: {
        plan: true,
        pagesLimit: true,
        totalPages: true,
        totalDocuments: true,
        totalIngestJobs: true,
        totalNamespaces: true,
        billingCycleStart: true,
        stripeId: true,
      },
    });

    return org!;
  }),
  upgrade: organizationMiddleware
    .input(
      z.object({
        plan: z.enum(["free", "pro"]),
        period: z.enum(["monthly", "yearly"]),
        baseUrl: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { plan, period, baseUrl } = input;

      const planKey = plan.replace(" ", "+");
      const prices = await stripe.prices.list({
        lookup_keys: [`${planKey}_${period}`],
      });
      const priceId = prices.data[0]!.id;

      const activeSubscription = ctx.organization.stripeId
        ? await stripe.subscriptions
            .list({
              customer: ctx.organization.stripeId,
              status: "active",
            })
            .then((res) => res.data[0])
        : null;

      // if the user has an active subscription, create billing portal to upgrade
      if (ctx.organization.stripeId && activeSubscription) {
        const { url } = await stripe.billingPortal.sessions.create({
          customer: ctx.organization.stripeId,
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
          ...(ctx.organization.stripeId
            ? {
                customer: ctx.organization.stripeId,
                // need to pass this or Stripe will throw an error: https://git.new/kX4fi6B
                customer_update: {
                  name: "auto",
                  address: "auto",
                },
              }
            : {
                customer_email: ctx.session.user.email,
              }),
          billing_address_collection: "required",
          success_url: `${getBaseUrl()}/${ctx.organization.slug}?upgraded=true&plan=${planKey}&period=${period}`,
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
          client_reference_id: ctx.organization.id,
          metadata: {
            agentsetCustomerId: ctx.session.user.id,
          },
        });

        return { sessionId: stripeSession.id };
      }
    }),
  invoices: organizationMiddleware.query(async ({ ctx }) => {
    if (!ctx.organization.stripeId) {
      return [];
    }

    try {
      const invoices = await stripe.invoices.list({
        customer: ctx.organization.stripeId,
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
  manage: organizationMiddleware.mutation(async ({ ctx }) => {
    if (!ctx.organization.stripeId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No Stripe customer ID",
      });
    }

    try {
      const { url } = await stripe.billingPortal.sessions.create({
        customer: ctx.organization.stripeId,
        return_url: `${getBaseUrl()}/${ctx.organization.slug}/billing`,
      });
      return url;
    } catch (error: any) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error?.raw?.message,
      });
    }
  }),
  getPaymentMethods: organizationMiddleware.query(async ({ ctx }) => {
    if (!ctx.organization.stripeId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No Stripe customer ID",
      });
    }

    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: ctx.organization.stripeId,
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
  addPaymentMethod: organizationMiddleware
    .input(
      z.object({
        method: z.enum(["card", "us_bank_account"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.organization.stripeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Stripe customer ID",
        });
      }

      if (!input.method) {
        const { url } = await stripe.billingPortal.sessions.create({
          customer: ctx.organization.stripeId,
          return_url: `${getBaseUrl()}/${ctx.organization.slug}/billing`,
          flow_data: {
            type: "payment_method_update",
          },
        });

        return url;
      }

      const { url } = await stripe.checkout.sessions.create({
        mode: "setup",
        customer: ctx.organization.stripeId,
        payment_method_types: [input.method],
        success_url: `${getBaseUrl()}/${ctx.organization.slug}/billing`,
        cancel_url: `${getBaseUrl()}/${ctx.organization.slug}/billing`,
      });

      return url;
    }),
  cancel: organizationMiddleware.mutation(async ({ ctx }) => {
    if (!ctx.organization.stripeId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No Stripe customer ID",
      });
    }

    try {
      const activeSubscription = await stripe.subscriptions
        .list({
          customer: ctx.organization.stripeId,
          status: "active",
        })
        .then((res) => res.data[0]);

      if (!activeSubscription)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription",
        });

      const { url } = await stripe.billingPortal.sessions.create({
        customer: ctx.organization.stripeId,
        return_url: `${getBaseUrl()}/${ctx.organization.slug}/billing`,
        flow_data: {
          type: "subscription_cancel",
          subscription_cancel: {
            subscription: activeSubscription.id,
          },
        },
      });
      return url;
    } catch (error: any) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.raw.message,
      });
    }
  }),
});
