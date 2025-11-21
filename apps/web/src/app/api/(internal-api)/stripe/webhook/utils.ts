import { revalidateTag } from "next/cache";
import { sendEmail } from "@/lib/resend";
import { waitUntil } from "@vercel/functions";

import type { Stripe } from "@agentset/stripe";
import { db } from "@agentset/db/client";

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
