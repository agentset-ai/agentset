import { db } from "@agentset/db/client";

/**
 * This script fills in the title and slug for hostings that don't have them.
 */
const hostingList = await db.hosting.findMany({
  where: {
    OR: [
      {
        slug: null,
      },
      {
        title: null,
      },
    ],
  },
  select: {
    id: true,
    title: true,
    slug: true,
    namespace: {
      select: {
        name: true,
        slug: true,
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    },
  },
});

let i = 0;
for (const hosting of hostingList) {
  console.log(`updating ${++i} / ${hostingList.length}`);

  await db.hosting.update({
    where: { id: hosting.id },
    data: {
      ...(!hosting.slug && {
        slug: `${hosting.namespace.organization.slug}-${hosting.namespace.slug}`,
      }),
      ...(!hosting.title && {
        title: hosting.namespace.organization.name,
      }),
    },
  });
}

console.log("Done!");
