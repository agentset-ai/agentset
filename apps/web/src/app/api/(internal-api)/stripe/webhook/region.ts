import type { Stripe } from "@agentset/stripe";
import type { DeploymentRegion } from "@agentset/utils";

type Metadata = Stripe.Metadata | null | undefined;

type EventObject = {
  object?: string;
  metadata?: Metadata;
  // invoices
  parent?: { subscription_details?: { metadata?: Metadata } | null } | null;
  // invoices rendered with API versions before 2025-03-31
  subscription_details?: { metadata?: Metadata } | null;
};

const getRegionMetadata = (object: EventObject) => {
  switch (object.object) {
    case "checkout.session":
    case "subscription":
      return object.metadata?.region;
    case "invoice":
      return (
        object.parent?.subscription_details?.metadata?.region ??
        object.subscription_details?.metadata?.region
      );
    default:
      return undefined;
  }
};

/**
 * The region an event belongs to, from the `region` metadata set on checkout
 * sessions and subscriptions. Undefined for events without it (e.g. those of
 * subscriptions created outside the app).
 */
export const getStripeEventRegion = (
  event: Stripe.Event,
): DeploymentRegion | undefined => {
  const region = getRegionMetadata(event.data.object as EventObject);
  return region === "us" || region === "eu" ? region : undefined;
};
