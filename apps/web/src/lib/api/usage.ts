import { AgentsetApiError, exceededLimitError } from "@/lib/api/errors";
import { waitUntil } from "@vercel/functions";

import { db } from "@agentset/db/client";
import { INFINITY_NUMBER } from "@agentset/utils";

export const incrementSearchUsage = (namespaceId: string, queries: number) => {
  // track usage
  waitUntil(
    (async () => {
      await db.namespace.update({
        where: {
          id: namespaceId,
        },
        data: {
          organization: {
            update: {
              searchUsage: { increment: queries },
            },
          },
        },
      });
    })(),
  );
};

export const incrementOrganizationSearchUsage = (
  organizationId: string,
  queries: number,
) => {
  // track usage
  waitUntil(
    (async () => {
      await db.organization.update({
        where: {
          id: organizationId,
        },
        data: {
          searchUsage: { increment: queries },
        },
      });
    })(),
  );
};

export const checkSearchLimit = (organization: {
  plan: string;
  searchLimit: number;
  searchUsage: number;
}) => {
  // if it's not a pro plan, check if the user has exceeded the limit
  // pro plan is unlimited but has INFINITY_NUMBER in the db
  if (
    INFINITY_NUMBER !== organization.searchLimit &&
    organization.searchUsage >= organization.searchLimit
  ) {
    throw new AgentsetApiError({
      code: "rate_limit_exceeded",
      message: exceededLimitError({
        plan: organization.plan,
        limit: organization.searchLimit,
        type: "retrievals",
      }),
    });
  }
};
