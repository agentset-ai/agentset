/**
 * Billing Router
 *
 * Handles billing and subscription operations.
 */

import { protectedProcedure } from "@/server/orpc/orpc";
import { addPaymentMethod } from "@/services/billing/addPaymentMethod";
import { cancelSubscription } from "@/services/billing/cancel";
import { getCurrentPlan } from "@/services/billing/getCurrentPlan";
import { getInvoices } from "@/services/billing/getInvoices";
import { getPaymentMethods } from "@/services/billing/getPaymentMethods";
import { manageBilling } from "@/services/billing/manage";
import { upgradePlan } from "@/services/billing/upgrade";
import { toProtectedAgentsetContext } from "@/services/shared/adapters";
import { z } from "zod/v4";

export const billingRouter = {
  getCurrentPlan: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getCurrentPlan(serviceContext, input);
    }),
  upgrade: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        plan: z.enum(["free", "pro"]),
        period: z.enum(["monthly", "yearly"]),
        baseUrl: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await upgradePlan(serviceContext, input);
    }),
  invoices: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getInvoices(serviceContext, input);
    }),
  manage: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await manageBilling(serviceContext, input);
    }),
  getPaymentMethods: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await getPaymentMethods(serviceContext, input);
    }),
  addPaymentMethod: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        method: z.enum(["card", "us_bank_account"]).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await addPaymentMethod(serviceContext, input);
    }),
  cancel: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const serviceContext = toProtectedAgentsetContext(context);
      return await cancelSubscription(serviceContext, input);
    }),
};
