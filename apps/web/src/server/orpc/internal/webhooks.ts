import { samplePayload } from "@/lib/webhook/sample-events/payload";
import { protectedProcedure } from "@/server/orpc/base";
import { createWebhook } from "@/services/webhooks/create";
import { deleteWebhook } from "@/services/webhooks/delete";
import { getWebhook } from "@/services/webhooks/get";
import { listWebhooks } from "@/services/webhooks/list";
import { requireWebhooksPlan } from "@/services/webhooks/plan";
import { regenerateWebhookSecret } from "@/services/webhooks/regenerate-secret";
import { toggleWebhook } from "@/services/webhooks/toggle";
import { updateWebhook } from "@/services/webhooks/update";
import { ORPCError } from "@orpc/server";
import { nanoid } from "nanoid";
import { z } from "zod/v4";

import { db } from "@agentset/db/client";
import { triggerSendWebhook } from "@agentset/jobs";
import { getWebhookEvents } from "@agentset/tinybird";
import {
  createWebhookSchema,
  updateWebhookSchema,
  WEBHOOK_EVENT_ID_PREFIX,
  WEBHOOK_TRIGGERS,
  webhookPayloadSchema,
} from "@agentset/webhooks";

export const webhooksRouter = {
  // List all webhooks for an organization
  list: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .handler(async ({ context, input }) => {
      // Verify user is member of org
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member) {
        throw new ORPCError("UNAUTHORIZED");
      }

      return listWebhooks({ organizationId: input.organizationId });
    }),

  // Get a single webhook by ID
  get: protectedProcedure
    .input(z.object({ organizationId: z.string(), webhookId: z.string() }))
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const webhook = await getWebhook({
        organizationId: input.organizationId,
        webhookId: input.webhookId,
      });

      if (!webhook) {
        throw new ORPCError("NOT_FOUND");
      }

      return webhook;
    }),

  // Get webhook events from Tinybird
  getEvents: protectedProcedure
    .input(z.object({ organizationId: z.string(), webhookId: z.string() }))
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member) {
        throw new ORPCError("UNAUTHORIZED");
      }

      // Verify webhook belongs to org
      const webhook = await db.webhook.findUnique({
        where: {
          id: input.webhookId,
          organizationId: input.organizationId,
        },
        select: { id: true },
      });

      if (!webhook) {
        throw new ORPCError("NOT_FOUND");
      }

      const events = await getWebhookEvents({ webhookId: input.webhookId });
      return events.data;
    }),

  // Create a new webhook
  create: protectedProcedure
    .input(createWebhookSchema.extend({ organizationId: z.string() }))
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.organizationId,
        },
        include: {
          organization: {
            select: { plan: true },
          },
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new ORPCError("UNAUTHORIZED");
      }

      // Check pro plan requirement
      requireWebhooksPlan(member.organization.plan);

      return createWebhook({
        name: input.name,
        url: input.url,
        secret: input.secret,
        triggers: input.triggers,
        namespaceIds: input.namespaceIds,
        organizationId: input.organizationId,
      });
    }),

  // Update a webhook
  update: protectedProcedure
    .input(
      updateWebhookSchema.extend({
        organizationId: z.string(),
        webhookId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.organizationId,
        },
        include: {
          organization: {
            select: { plan: true },
          },
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new ORPCError("UNAUTHORIZED");
      }

      requireWebhooksPlan(member.organization.plan);

      const webhook = await updateWebhook({
        organizationId: input.organizationId,
        webhookId: input.webhookId,
        name: input.name,
        url: input.url,
        secret: input.secret,
        triggers: input.triggers,
        namespaceIds: input.namespaceIds,
      });

      if (!webhook) {
        throw new ORPCError("NOT_FOUND");
      }

      return webhook;
    }),

  // Delete a webhook
  delete: protectedProcedure
    .input(z.object({ organizationId: z.string(), webhookId: z.string() }))
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const webhook = await deleteWebhook({
        organizationId: input.organizationId,
        webhookId: input.webhookId,
      });

      if (!webhook) {
        throw new ORPCError("NOT_FOUND");
      }

      return { success: true };
    }),

  // Toggle webhook enabled/disabled
  toggle: protectedProcedure
    .input(z.object({ organizationId: z.string(), webhookId: z.string() }))
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const updatedWebhook = await toggleWebhook({
        organizationId: input.organizationId,
        webhookId: input.webhookId,
      });

      if (!updatedWebhook) {
        throw new ORPCError("NOT_FOUND");
      }

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
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const webhook = await db.webhook.findUnique({
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
        throw new ORPCError("NOT_FOUND");
      }

      const payload = webhookPayloadSchema.parse({
        id: `${WEBHOOK_EVENT_ID_PREFIX}${nanoid(25)}`,
        event: input.trigger,
        createdAt: new Date().toISOString(),
        data: samplePayload[input.trigger],
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
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member || (member.role !== "admin" && member.role !== "owner")) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const updatedWebhook = await regenerateWebhookSecret({
        organizationId: input.organizationId,
        webhookId: input.webhookId,
      });

      if (!updatedWebhook) {
        throw new ORPCError("NOT_FOUND");
      }

      return { secret: updatedWebhook.secret };
    }),

  // Get namespaces for webhook namespace selector
  getNamespaces: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .handler(async ({ context, input }) => {
      const member = await db.member.findFirst({
        where: {
          userId: context.session.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!member) {
        throw new ORPCError("UNAUTHORIZED");
      }

      const namespaces = await db.namespace.findMany({
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
};
