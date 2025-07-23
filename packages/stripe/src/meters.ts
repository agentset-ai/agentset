import { stripe } from "./instance";
import { PRO_PLAN_METERED } from "./plans";

export const meterIngestedPages = async ({
  documentId,
  totalPages,
  stripeCustomerId,
}: {
  documentId: string;
  totalPages: number;
  stripeCustomerId: string;
}) => {
  await stripe.billing.meterEvents.create({
    identifier: documentId, // idempotency key
    event_name: PRO_PLAN_METERED.meterName,
    timestamp: Math.floor(Date.now() / 1000), // send timestamp in seconds
    payload: {
      stripe_customer_id: stripeCustomerId,
      value: totalPages.toFixed(2),
    },
  });
};

export const meterDocumentsPages = async ({
  documents,
  stripeCustomerId,
}: {
  documents: {
    id: string;
    totalPages: number;
  }[];
  stripeCustomerId: string;
}) => {
  // Track each document to Stripe metered billing
  const billingRestartTimestamp = new Date().toISOString();

  await stripe.v2.billing.meterEventStream.create({
    events: documents.map((document) => ({
      identifier: document.id, // idempotency key
      event_name: PRO_PLAN_METERED.meterName,
      timestamp: billingRestartTimestamp.toString(),
      payload: {
        stripe_customer_id: stripeCustomerId,
        value: document.totalPages.toFixed(2),
      },
    })),
  });
};
