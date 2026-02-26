import { revalidateTag } from "next/cache";
import { waitUntil } from "@vercel/functions";

import type { Organization, Prisma } from "@agentset/db";
import type { Stripe } from "@agentset/stripe";
import { db } from "@agentset/db/client";
import { sendEmail } from "@agentset/emails";
import {
  getPlanFromPriceId,
  parseEnterprisePlanMetadata,
  planToOrganizationFields,
} from "@agentset/stripe/plans";
import { webhookCache } from "@agentset/webhooks/server";

const cancellationReasonMap = {
  customer_service: "you had a bad experience with our customer service",
  low_quality: "the product didn't meet your expectations",
  missing_features: "you were expecting more features",
  switched_service: "you switched to a different service",
  too_complex: "the product was too complex",
  too_expensive: "the product was too expensive",
  unused: "you didn't use the product",
} satisfies Partial<
  Record<Stripe.Subscription.CancellationDetails.Feedback, string>
>;

export async function sendCancellationFeedback({
  owners,
  reason,
}: {
  owners: {
    name: string | null;
    email: string;
  }[];
  reason?: Stripe.Subscription.CancellationDetails.Feedback | null;
}) {
  const reasonText = reason
    ? cancellationReasonMap[reason as keyof typeof cancellationReasonMap]
    : "";

  return await Promise.all(
    owners.map(
      (owner) =>
        owner.email &&
        sendEmail({
          email: owner.email,
          from: "Abdellatif <contact@agentset.ai>",
          replyTo: "contact@agentset.ai",
          subject: "Feedback for Agentset.ai?",
          text: `Hey ${owner.name ? owner.name.split(" ")[0] : "there"}!\n\nSaw you canceled your Agentset subscription${reasonText ? ` and mentioned that ${reasonText}` : ""} – do you mind sharing if there's anything we could've done better on our side?\n\nWe're always looking to improve our product offering so any feedback would be greatly appreciated!\n\nThank you so much in advance!\n\nBest,\nAbdellatif\nCo-founder, Agentset.ai`,
        }),
    ),
  );
}

export function revalidateOrganizationCache(organizationId: string) {
  waitUntil(
    (async () => {
      revalidateTag(`org:${organizationId}`, "max");

      const apiKeys = await db.organizationApiKey.findMany({
        where: {
          organizationId,
        },
        select: {
          key: true,
        },
      });

      for (const apiKey of apiKeys) {
        revalidateTag(`apiKey:${apiKey.key}`, "max");
      }
    })(),
  );
}

export async function updateOrganizationPlan({
  organization,
  items,
  metadata,
}: {
  organization: Pick<Organization, "id" | "plan" | "paymentFailedAt">;
  items: Stripe.SubscriptionItem[];
  metadata?: Record<string, string> | null;
}) {
  // ignore metered plan
  const priceId = items.filter(
    (item) =>
      item.price.recurring?.usage_type !== "metered" &&
      !item.price.recurring?.meter,
  )[0]!.price.id;

  const newPlan = getPlanFromPriceId(priceId);
  const enterpriseFields = parseEnterprisePlanMetadata(metadata);

  let newPlanName: string;
  let planData: Prisma.OrganizationUpdateInput;

  if (newPlan) {
    newPlanName = newPlan.name.toLowerCase();
    planData = planToOrganizationFields(newPlan);
  } else if (enterpriseFields) {
    newPlanName = enterpriseFields.plan.toLowerCase();
    planData = enterpriseFields;
  } else {
    return;
  }

  const shouldDisableWebhooks = newPlanName === "free";

  if (organization.plan !== newPlanName) {
    await db.organization.update({
      where: {
        id: organization.id,
      },
      data: {
        paymentFailedAt: null,
        ...planData,
        ...(shouldDisableWebhooks && { webhookEnabled: false }),
      },
      select: {
        id: true,
      },
    });

    revalidateOrganizationCache(organization.id);

    // Disable the webhooks if the new plan does not support webhooks
    if (shouldDisableWebhooks) {
      await db.webhook.updateMany({
        where: {
          organizationId: organization.id,
        },
        data: {
          disabledAt: new Date(),
        },
      });

      await webhookCache.invalidateOrg(organization.id);
    }
  } else if (organization.paymentFailedAt) {
    await db.organization.update({
      where: {
        id: organization.id,
      },
      data: {
        paymentFailedAt: null,
      },
    });
  }
}
