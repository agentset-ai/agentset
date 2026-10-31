// Releases deleted pages that should have left an organization's quota at a
// past period rollover (e.g. one the reset-usage cron missed). Dry run by
// default.
//
//   bun --env-file=<env> scripts/release-deleted-pages.ts --audit
//   bun --env-file=<env> scripts/release-deleted-pages.ts --org <slug> --pages <n> [--apply]
//
// --audit lists organizations with deleted pages, with their usage period.
// --pages is how many of the organization's deleted pages belong to periods
// that are already over: the deleted pages minus those deleted since the
// current period started. Pages deleted during the current period are
// released at its end, so leave them out.
import { parseArgs } from "node:util";

import { db } from "@agentset/db/client";

const { values } = parseArgs({
  options: {
    audit: { type: "boolean", default: false },
    org: { type: "string" },
    pages: { type: "string" },
    apply: { type: "boolean", default: false },
  },
});

const getActivePages = async (organizationId: string) => {
  const { _sum } = await db.namespace.aggregate({
    where: { organizationId },
    _sum: { totalPages: true },
  });
  return _sum.totalPages ?? 0;
};

if (values.audit) {
  const organizations = await db.organization.findMany({
    where: { deletedPages: { gt: 0 } },
    select: {
      id: true,
      slug: true,
      plan: true,
      totalPages: true,
      deletedPages: true,
      billingPeriodStart: true,
      billingPeriodEnd: true,
    },
    orderBy: { deletedPages: "desc" },
  });

  console.table(
    organizations.map((organization) => ({
      slug: organization.slug,
      plan: organization.plan,
      totalPages: organization.totalPages,
      deletedPages: organization.deletedPages,
      periodStart: organization.billingPeriodStart?.toISOString() ?? null,
      periodEnd: organization.billingPeriodEnd?.toISOString() ?? null,
    })),
  );
  process.exit(0);
}

const pages = Number(values.pages);
if (!values.org || !Number.isFinite(pages) || pages <= 0) {
  console.error("Usage: --audit | --org <slug> --pages <n> [--apply]");
  process.exit(1);
}

const organization = await db.organization.findUnique({
  where: { slug: values.org },
  select: {
    id: true,
    slug: true,
    totalPages: true,
    deletedPages: true,
    billingPeriodStart: true,
    billingPeriodEnd: true,
  },
});

if (!organization) {
  console.error(`Organization ${values.org} not found`);
  process.exit(1);
}

const activePages = await getActivePages(organization.id);
console.log({
  ...organization,
  activePages,
  after: {
    totalPages: organization.totalPages - pages,
    deletedPages: organization.deletedPages - pages,
  },
});

if (pages > organization.deletedPages) {
  console.error(
    `Can't release ${pages} pages, the organization only has ${organization.deletedPages} deleted pages`,
  );
  process.exit(1);
}

// totalPages = active pages + deleted pages; refuse to touch counters that
// disagree, they need a closer look first
const drift = organization.totalPages - organization.deletedPages - activePages;
if (Math.abs(drift) > 1) {
  console.error(
    `totalPages - deletedPages is off from the namespaces' pages by ${drift}, aborting`,
  );
  process.exit(1);
}

if (!values.apply) {
  console.log("Dry run, pass --apply to release the pages");
  process.exit(0);
}

// only applies if the counters didn't change since they were read
const { count } = await db.organization.updateMany({
  where: {
    id: organization.id,
    totalPages: organization.totalPages,
    deletedPages: organization.deletedPages,
  },
  data: {
    totalPages: { decrement: pages },
    deletedPages: { decrement: pages },
  },
});

if (count === 0) {
  console.error("The organization's pages changed while running, run it again");
  process.exit(1);
}

console.log(`Released ${pages} deleted pages of ${organization.slug}`);
process.exit(0);
