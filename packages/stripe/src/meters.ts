import { prefixId } from "@agentset/utils";

import { stripe } from "./instance";
import { PRO_PLAN_METERED } from "./plans";

// Stripe dedups meter events by identifier for at least 24 hours, so a
// document re-metered for a new billing period needs an identifier scoped to
// that period, or it is dropped when it was metered less than a day before.
export const getDocumentMeterIdentifier = (
  documentId: string,
  periodStart?: Date | null,
) => {
  const identifier = prefixId(documentId, "doc_");
  return periodStart
    ? `${identifier}_p${Math.floor(periodStart.getTime() / 1000)}`
    : identifier;
};

export const meterIngestedPages = async ({
  documentId,
  totalPages,
  stripeCustomerId,
  periodStart,
  timestamp = new Date(),
}: {
  documentId: string;
  totalPages: number;
  stripeCustomerId: string;
  // the organization's meteredPeriodStart: the re-meter of the same period uses
  // the same identifier, so a document metered by both is only counted once
  periodStart?: Date | null;
  timestamp?: Date;
}) => {
  // TODO: track characters instead of pages
  const value = Number(totalPages.toFixed(0));
  if (value === 0) return;

  await stripe.billing.meterEvents.create({
    identifier: getDocumentMeterIdentifier(documentId, periodStart), // idempotency key
    event_name: PRO_PLAN_METERED.meterName,
    timestamp: Math.floor(timestamp.getTime() / 1000), // send timestamp in seconds
    payload: {
      stripe_customer_id: stripeCustomerId,
      value: value.toString(),
    },
  });
};

export const createMeterEventSessionToken = async () => {
  const token = await stripe.v2.billing.meterEventSession.create();
  return token.authentication_token;
};

export const meterDocumentsPages = async ({
  documents,
  stripeCustomerId,
  token,
  periodStart,
}: {
  documents: {
    id: string;
    totalPages: number;
  }[];
  stripeCustomerId: string;
  token: string;
  // the Stripe billing period the documents are re-metered for
  periodStart?: Date | null;
}) => {
  // Track each document to Stripe metered billing
  const billingRestartTimestamp = new Date().toISOString();

  await stripe.v2.billing.meterEventStream.create(
    {
      events: documents.map((document) => ({
        identifier: getDocumentMeterIdentifier(document.id, periodStart), // idempotency key
        event_name: PRO_PLAN_METERED.meterName,
        timestamp: billingRestartTimestamp.toString(),
        payload: {
          stripe_customer_id: stripeCustomerId,
          value: document.totalPages.toFixed(2),
        },
      })),
    },
    {
      apiKey: token,
    },
  );
};
