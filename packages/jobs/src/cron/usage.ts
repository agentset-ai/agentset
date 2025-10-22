import { schedules } from "@trigger.dev/sdk";

import { isProPlan } from "@agentset/stripe/plans";
import { getAdjustedBillingCycleStart } from "@agentset/utils";

import { getDb } from "../db";
import { meterOrgDocuments } from "../tasks/meter-org-documents";

const limit = 100;
export const usageCronJob = schedules.task({
  id: "reset-usage",
  // This route is used to update the usage stats of each organization.
  // Runs once every day at noon UTC (0 12 * * *)
  cron: "0 12 * * *",
  run: async () => {
    const db = getDb();

    while (true) {
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

      if (organizations.length === 0) break;

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
          (organization) =>
            isProPlan(organization.plan) && organization.stripeId,
        );

        if (orgsToMeter.length > 0) {
          await meterOrgDocuments.batchTrigger(
            orgsToMeter.map(({ id }) => ({
              payload: {
                organizationId: id,
              },
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
      // const exceedingUsage = organizations.filter(
      //   ({ searchUsage, searchLimit, pagesLimit, totalPages }) =>
      //     searchUsage > searchLimit || totalPages > pagesLimit,
      // );

      // if (exceedingUsage.length > 0) {
      //   // TODO: notify via email that they're exceeding the usage
      //   await Promise.allSettled(
      //     exceedingUsage.map(async (organization) => {
      //       const { slug, plan, members, searchLimit, searchUsage } =
      //         organization;
      //       const emails = members.map((member) => member.user.email);

      //       await log({
      //         message: `*${slug}* is over their *${capitalize(
      //           plan,
      //         )} Plan* usage limit. Usage: ${searchUsage}, Limit: ${searchLimit}, Email: ${emails.join(
      //           ", ",
      //         )}`,
      //         type: plan === "free" ? "cron" : "alerts",
      //       });
      //     }),
      //   );
      // }
    }
  },
});
