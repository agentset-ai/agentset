import { APP_DOMAIN } from "@/lib/constants";
import { sendEmail } from "@/lib/resend";

import type { Stripe } from "@agentset/stripe";
import { db } from "@agentset/db/client";
import { FailedPayment } from "@agentset/emails";

export async function invoicePaymentFailed(event: Stripe.Event) {
  const {
    customer: stripeId,
    attempt_count: attemptCount,
    amount_due: amountDue,
  } = event.data.object as Stripe.Invoice;

  if (!stripeId) {
    console.log(
      "Invoice with Stripe ID *`" +
        stripeId +
        "`* not found in invoice.payment_failed event",
    );
    return;
  }

  const stripeIdString = typeof stripeId === "string" ? stripeId : stripeId.id;

  const organization = await db.organization.findUnique({
    where: {
      stripeId: stripeIdString,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      members: {
        select: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        where: {
          role: "owner",
        },
      },
    },
  });

  if (!organization) {
    console.log(
      "Organization with Stripe ID *`" +
        stripeIdString +
        "`* not found in invoice.payment_failed event",
    );
    return;
  }

  await Promise.allSettled([
    db.organization.update({
      where: {
        id: organization.id,
      },
      data: {
        paymentFailedAt: new Date(),
      },
    }),
    ...organization.members.map(({ user }) =>
      sendEmail({
        email: user.email,
        subject: `${
          attemptCount == 2
            ? "2nd notice: "
            : attemptCount == 3
              ? "3rd notice: "
              : ""
        }Your payment for Agentset.ai failed`,
        react: FailedPayment({
          attemptCount,
          amountDue,
          user,
          organization,
          domain: APP_DOMAIN,
        }),
        variant: "notifications",
      }),
    ),
  ]);
}
