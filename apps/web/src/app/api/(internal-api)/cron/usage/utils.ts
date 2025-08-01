import { APP_DOMAIN } from "@/lib/constants";
import { getAdjustedBillingCycleStart } from "@/lib/datetime";
import { log } from "@/lib/log";
import { qstashClient } from "@/lib/qstash";
import { capitalize } from "@/lib/string-utils";

import { db } from "@agentset/db";
import { triggerMeterOrgDocumentsBatch } from "@agentset/jobs";
import { isProPlan } from "@agentset/stripe/plans";

const limit = 100;

export const updateUsage = async () => {
  const organizations = await db.organization.findMany({
    where: {
      // Check only organizations that haven't been checked in the last 12 hours
      usageLastChecked: {
        lt: new Date(new Date().getTime() - 12 * 60 * 60 * 1000),
      },
    },
    include: {
      members: {
        select: {
          user: true,
        },
        where: {
          role: "owner",
        },
        take: 10, // Only send to the first 10 users
      },
    },
    orderBy: [
      {
        usageLastChecked: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    take: limit,
  });

  // if no organizations left, meaning cron is complete
  if (organizations.length === 0) {
    return;
  }

  // Reset billing cycles for organizations that have
  // adjustedBillingCycleStart that matches today's date
  const billingReset: typeof organizations = [];
  const nonBillingReset: typeof organizations = [];
  const today = new Date().getDate();
  for (const organization of organizations) {
    if (
      typeof organization.billingCycleStart === "number" &&
      getAdjustedBillingCycleStart(organization.billingCycleStart) === today
    ) {
      billingReset.push(organization);
    } else {
      nonBillingReset.push(organization);
    }
  }

  // TODO: send 30-day summary email
  // TODO: only reset usage if it's not over usageLimit by 2x
  if (billingReset.length > 0) {
    // Reset search usage for billing cycle restart
    await db.organization.updateMany({
      where: {
        id: {
          in: billingReset.map(({ id }) => id),
        },
      },
      data: {
        searchUsage: 0,
        usageLastChecked: new Date(),
      },
    });

    // track their usage for the billing cycle restart
    const orgsToMeter = billingReset.filter(
      (organization) => isProPlan(organization.plan) && organization.stripeId,
    );
    if (orgsToMeter.length > 0) {
      await triggerMeterOrgDocumentsBatch(
        orgsToMeter.map(({ id }) => ({
          organizationId: id,
        })),
      );
    }
  }

  // Update usageLastChecked for organizations
  if (nonBillingReset.length > 0) {
    await db.organization.updateMany({
      where: {
        id: {
          in: nonBillingReset.map(({ id }) => id),
        },
      },
      data: {
        usageLastChecked: new Date(),
      },
    });
  }

  // Get all organizations that have exceeded usage
  const exceedingUsage = organizations.filter(
    ({ searchUsage, searchLimit }) => searchUsage > searchLimit,
  );

  if (exceedingUsage.length > 0) {
    // TODO: notify via email that they're exceeding the usage
    await Promise.allSettled(
      exceedingUsage.map(async (organization) => {
        const { slug, plan, members, searchLimit, searchUsage } = organization;
        const emails = members.map((member) => member.user.email);

        await log({
          message: `*${slug}* is over their *${capitalize(
            plan,
          )} Plan* usage limit. Usage: ${searchUsage}, Limit: ${searchLimit}, Email: ${emails.join(
            ", ",
          )}`,
          type: plan === "free" ? "cron" : "alerts",
        });
      }),
    );
  }

  return await qstashClient.publishJSON({
    url: `${APP_DOMAIN}/api/cron/usage`,
    method: "POST",
    body: {},
  });
};
