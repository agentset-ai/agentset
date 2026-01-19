import { createWebhook } from "@/lib/webhook/create-webhook";
import { getWebhooks } from "@/lib/webhook/get-webhooks";
import { samplePayload } from "@/lib/webhook/sample-events/payload";
import { createWebhookSecret } from "@/lib/webhook/secret";
import { transformWebhook } from "@/lib/webhook/transform";
import { toggleWebhooksForOrganization } from "@/lib/webhook/update-webhook";
import { validateWebhook } from "@/lib/webhook/validate-webhook";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod/v4";

import { triggerSendWebhook } from "@agentset/jobs";
import { isFreePlan } from "@agentset/stripe/plans";
import { getWebhookEvents } from "@agentset/tinybird";
import {
  createWebhookSchema,
  updateWebhookSchema,
  webhookPayloadSchema,
  WEBHOOK_EVENT_ID_PREFIX,
  WEBHOOK_TRIGGERS,
  type WebhookTrigger,
} from "@agentset/webhooks";

// Helper to check if organization has webhooks access (pro plan required)
const requireProPlan = (plan: string) => {
  if (isFreePlan(plan)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Webhooks are only available on the Pro plan and above. Please upgrade to use this feature.",
    });
  }
};

export const webhooksRouter = createTRPCRouter({
  // List all webhooks for an organization
  list: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user is member of org
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const webhooks = await getWebhooks({
        organizationId: input.organizationId,
      });

      return webhooks.map(transformWebhook);
    }),

  // Get a single webhook by ID
  get: protectedProcedure
    .input(z.object({ organizationId: z.string(), webhookId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const webhook = await ctx.db.webhook.findUnique({
        where: {
          id: input.webhookId,
          organizationId: input.organizationId,
        },
        select: {
          id: true,
          name: true,
          url: true,
          secret: true,
          triggers: true,
          disabledAt: true,
          consecutiveFailures: true,
          lastFailedAt: true,
          createdAt: true,
          namespaces: {
            select: {
              namespaceId: true,
            },
          },
        },
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        ...transformWebhook(webhook),
        consecutiveFailures: webhook.consecutiveFailures,
        lastFailedAt: webhook.lastFailedAt,
        createdAt: webhook.createdAt,
      };
    }),

  // Get webhook events from Tinybird
  getEvents: protectedProcedure
    .input(z.object({ organizationId: z.string(), webhookId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Verify webhook belongs to org
      const webhook = await ctx.db.webhook.findUnique({
        where: {
          id: input.webhookId,
          organizationId: input.organizationId,
        },
        select: { id: true },
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const events = await getWebhookEvents({ webhookId: input.webhookId });
      return events.data;
    }),

  // Create a new webhook
  create: protectedProcedure
    .input(createWebhookSchema.extend({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
        include: {
          organization: {
            select: { plan: true },
          },
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Check pro plan requirement
      requireProPlan(member.organization.plan);

      await validateWebhook({
        input,
        organizationId: input.organizationId,
      });

      const webhook = await createWebhook({
        name: input.name,
        url: input.url,
        secret: input.secret,
        triggers: input.triggers,
        namespaceIds: input.namespaceIds,
        organizationId: input.organizationId,
      });

      return transformWebhook(webhook);
    }),

  // Update a webhook
  update: protectedProcedure
    .input(
      updateWebhookSchema.extend({
        organizationId: z.string(),
        webhookId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
        include: {
          organization: {
            select: { plan: true },
          },
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      requireProPlan(member.organization.plan);

      const existingWebhook = await ctx.db.webhook.findUnique({
        where: {
          id: input.webhookId,
          organizationId: input.organizationId,
        },
      });

      if (!existingWebhook) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await validateWebhook({
        input,
        organizationId: input.organizationId,
        webhook: existingWebhook,
      });

      const { name, url, triggers, namespaceIds } = input;

      const webhook = await ctx.db.webhook.update({
        where: {
          id: input.webhookId,
          organizationId: input.organizationId,
        },
        data: {
          ...(name && { name }),
          ...(url && { url }),
          ...(triggers && { triggers }),
          ...(namespaceIds !== undefined && {
            namespaces: {
              deleteMany: {},
              ...(namespaceIds.length > 0 && {
                create: namespaceIds.map((namespaceId) => ({
                  namespaceId,
                })),
              }),
            },
          }),
        },
        select: {
          id: true,
          name: true,
          url: true,
          secret: true,
          triggers: true,
          disabledAt: true,
          namespaces: {
            select: {
              namespaceId: true,
            },
          },
        },
      });

      return transformWebhook(webhook);
    }),

  // Delete a webhook
  delete: protectedProcedure
    .input(z.object({ organizationId: z.string(), webhookId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const webhook = await ctx.db.webhook.findUnique({
        where: {
          id: input.webhookId,
          organizationId: input.organizationId,
        },
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.webhook.delete({
        where: { id: input.webhookId },
      });

      await toggleWebhooksForOrganization({
        organizationId: input.organizationId,
      });

      return { success: true };
    }),

  // Toggle webhook enabled/disabled
  toggle: protectedProcedure
    .input(z.object({ organizationId: z.string(), webhookId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const webhook = await ctx.db.webhook.findUnique({
        where: {
          id: input.webhookId,
          organizationId: input.organizationId,
        },
        select: { disabledAt: true },
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const disabledAt = webhook.disabledAt ? null : new Date();

      const updatedWebhook = await ctx.db.webhook.update({
        where: { id: input.webhookId },
        data: {
          disabledAt,
          // Reset failure count when re-enabling
          ...(webhook.disabledAt && {
            consecutiveFailures: 0,
            lastFailedAt: null,
          }),
        },
      });

      await toggleWebhooksForOrganization({
        organizationId: input.organizationId,
      });

      return { disabledAt: updatedWebhook.disabledAt };
    }),

  // Send test webhook event
  sendTest: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        webhookId: z.string(),
        trigger: z.enum(WEBHOOK_TRIGGERS),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const webhook = await ctx.db.webhook.findUnique({
        where: {
          id: input.webhookId,
          organizationId: input.organizationId,
        },
        select: {
          id: true,
          url: true,
          secret: true,
        },
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const payload = webhookPayloadSchema.parse({
        id: `${WEBHOOK_EVENT_ID_PREFIX}${nanoid(25)}`,
        event: input.trigger,
        createdAt: new Date().toISOString(),
        data: samplePayload[input.trigger as WebhookTrigger],
      });

      await triggerSendWebhook({
        webhookId: webhook.id,
        eventId: payload.id,
        event: input.trigger,
        url: webhook.url,
        secret: webhook.secret,
        payload,
      });

      return { success: true };
    }),

  // Generate a new secret for a webhook
  regenerateSecret: protectedProcedure
    .input(z.object({ organizationId: z.string(), webhookId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const webhook = await ctx.db.webhook.findUnique({
        where: {
          id: input.webhookId,
          organizationId: input.organizationId,
        },
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const newSecret = createWebhookSecret();

      await ctx.db.webhook.update({
        where: { id: input.webhookId },
        data: { secret: newSecret },
      });

      return { secret: newSecret };
    }),

  // Get namespaces for webhook namespace selector
  getNamespaces: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const namespaces = await ctx.db.namespace.findMany({
        where: {
          organizationId: input.organizationId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return namespaces;
    }),
});
