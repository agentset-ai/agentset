import type { Prisma } from "@agentset/db";
import { INFINITY_NUMBER } from "@agentset/utils";

import { env } from "./env";

export type PlanFeature = {
  id?: string;
  text: string;
  disabled?: boolean;
  tooltip?: {
    title: string;
    cta: string;
    href: string;
  };
};

export const PLANS = [
  {
    name: "Free",
    description: "For personal use and small projects.",
    price: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      pages: 1000,
      retrievals: 10_000,
      api: 60,
      // namespaces: 3,
      // users: 1,
    },
    features: [
      { id: "pages", text: "1,000 pages included" },
      { id: "retrievals", text: "10,000 retrievals /month" },
      { id: "api", text: "60 API calls /min" },
      { id: "support", text: "Basic support" },
      {
        id: "additional_pages",
        text: "$0.01 per additional page",
        disabled: true,
      },
      { id: "connector", text: "$100 per connector", disabled: true },
      // { id: "users", text: "1 user" },
      // { id: "namespaces", text: "3 namespaces" },
    ] satisfies PlanFeature[],
  },
  {
    name: "Pro",
    description: "For production applications ready to scale.",
    price: {
      monthly: 49,
      yearly: 490,
      ids: [
        "price_1RE26ODPtsw7PNYQduDp19Gx", // yearly
        "price_1RE26ODPtsw7PNYQlDfyMYjV", // monthly

        "price_1RE25PDPtsw7PNYQXPwhPIAt", // yearly (test)
        "price_1RE25PDPtsw7PNYQQjlEQbPf", // monthly (test)
      ],
    },
    limits: {
      pages: 10_000,
      retrievals: INFINITY_NUMBER,
      api: 600,
      // users: 10,
      // namespaces: 10,
    },
    featureTitle: "Everything in Free, plus:",
    features: [
      { id: "pages", text: "10,000 pages included" },
      { id: "retrievals", text: "Unlimited retrievals" },
      { id: "additional_pages", text: "$0.01 per additional page" },
      { id: "connector", text: "$100 per connector" },
      { id: "api", text: "600 API calls /min" },
      { id: "support", text: "Email support" },
      // { id: "users", text: "10 users" },
      // { id: "namespaces", text: "10 namespaces" },
    ] satisfies PlanFeature[],
  },
];

export const ENTERPRISE_PLAN = {
  name: "Enterprise",
  description: "For organizations with custom workflows.",
  price: "Custom",
  features: [
    { id: "pages", text: "Unlimited pages" },
    { id: "retrievals", text: "Unlimited retrievals" },
    { id: "connector", text: "Custom connector pricing" },
    { id: "integrations", text: "Custom integrations" },
    { id: "api", text: "Custom API rate limit" },
    { id: "support", text: "Dedicated account manager" },
    // { id: "users", text: "1 user" },
    // { id: "namespaces", text: "3 namespaces" },
  ] satisfies PlanFeature[],
};

export const PRO_PLAN_METERED = {
  meterName: "ingested_pages",
  monthly: {
    lookupKey: "pro_plan_metered",
    priceId: {
      test: "price_1RapvfDPtsw7PNYQvLZvqIpc",
      live: "price_1RaqhNDPtsw7PNYQ9lqtoORc",
    },
  },
  yearly: {
    lookupKey: "pro_plan_metered_yearly",
    priceId: {
      test: "price_1RmA0bDPtsw7PNYQ5PAGCBeW",
      live: "price_1Rm9yXDPtsw7PNYQCUTQIMCo",
    },
  },
};

export const getStripeEnvironment = () => {
  if (env.NODE_ENV === "production") return "live";
  return "test";
};

export const FREE_PLAN = PLANS.find((plan) => plan.name === "Free")!;
export const PRO_PLAN = PLANS.find((plan) => plan.name === "Pro")!;

export const SELF_SERVE_PAID_PLANS = PLANS.filter((p) =>
  ["Pro"].includes(p.name),
);

export const FREE_ORGANIZATIONS_LIMIT = 2;

export const getPlanFromPriceId = (priceId?: string) => {
  if (!priceId) return null;
  return PLANS.find((plan) => plan.price.ids?.includes(priceId)) || null;
};

export const getPlanDetails = (plan: string) => {
  return SELF_SERVE_PAID_PLANS.find(
    (p) => p.name.toLowerCase() === plan.toLowerCase(),
  )!;
};

export const getCurrentPlan = (plan: string) => {
  return (
    PLANS.find((p) => p.name.toLowerCase() === plan.toLowerCase()) || FREE_PLAN
  );
};

export const getNextPlan = (plan?: string | null) => {
  if (!plan) return PRO_PLAN;
  return PLANS[
    PLANS.findIndex((p) => p.name.toLowerCase() === plan.toLowerCase()) + 1
  ];
};

export const isDowngradePlan = (currentPlan: string, newPlan: string) => {
  const currentPlanIndex = PLANS.findIndex(
    (p) => p.name.toLowerCase() === currentPlan.toLowerCase(),
  );
  const newPlanIndex = PLANS.findIndex(
    (p) => p.name.toLowerCase() === newPlan.toLowerCase(),
  );
  return currentPlanIndex > newPlanIndex;
};

export const planToOrganizationFields = (plan: (typeof PLANS)[number]) => {
  return {
    plan: plan.name.toLowerCase(),
    pagesLimit: plan.limits.pages,
    searchLimit: plan.limits.retrievals,
    apiRatelimit: plan.limits.api,
    // TODO: add other limits
  } satisfies Prisma.OrganizationUpdateInput;
};

export const isProPlan = (plan: string) => {
  return plan.toLowerCase() === "pro";
};

export const isFreePlan = (plan: string) => {
  return plan.toLowerCase() === "free";
};

export const isEnterprisePlan = (plan: string) => {
  return plan.toLowerCase() === "enterprise";
};
