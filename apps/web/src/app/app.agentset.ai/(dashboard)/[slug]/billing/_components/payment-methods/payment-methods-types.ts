"use client";

import { CreditCardIcon, LandmarkIcon } from "lucide-react";

import type { Stripe } from "@agentset/stripe";
import { CardAmex } from "@agentset/ui/icons/card-amex";
import { CardDiscover } from "@agentset/ui/icons/card-discover";
import { CardMastercard } from "@agentset/ui/icons/card-mastercard";
import { CardVisa } from "@agentset/ui/icons/card-visa";
import { StripeLink } from "@agentset/ui/icons/stripe-link";
import { capitalize } from "@agentset/utils";

export const PaymentMethodTypesList = (paymentMethod?: Stripe.PaymentMethod) =>
  [
    {
      type: "card",
      title: "Card",
      icon: paymentMethod?.card
        ? ({
            amex: CardAmex,
            discover: CardDiscover,
            mastercard: CardMastercard,
            visa: CardVisa,
          }[paymentMethod.card.brand] ?? CreditCardIcon)
        : CreditCardIcon,
      description: paymentMethod?.card
        ? `Connected ${capitalize(paymentMethod.card.brand)} ***${paymentMethod.card.last4}`
        : "No card connected",
      iconBgColor: "bg-neutral-100",
    },
    {
      type: "us_bank_account",
      title: "ACH",
      icon: LandmarkIcon,
      description: paymentMethod?.us_bank_account
        ? `Account ending in ****${paymentMethod.us_bank_account.last4}`
        : "Not connected",
    },
    {
      type: "link",
      title: "Link",
      icon: StripeLink,
      iconBgColor: "bg-green-100",
      description: paymentMethod?.link
        ? `Account with ${paymentMethod.link.email}`
        : "No Link account connected",
    },
  ] satisfies {
    type: Stripe.PaymentMethod.Type;
    title: string;
    icon: React.ElementType;
    description: string;
    iconBgColor?: string;
  }[];
