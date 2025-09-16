import { db } from "@agentset/db";

const namespaces = await db.namespace.findMany({
  select: {
    id: true,
  },
  where: {
    updatedAt: {
      lt: new Date("2025-09-16T21:14:50.075Z"),
    },
  },
});

console.log(`Found ${namespaces.length} namespaces`);
for (const namespace of namespaces) {
  let lastUpdated = null;
  let totalUpdated = 0;
  while (lastUpdated === null || lastUpdated >= 6000) {
    const result = await db.document.updateMany({
      where: { ingestJob: { namespaceId: namespace.id }, namespaceId: null },
      data: { namespaceId: namespace.id },
      limit: 6000,
    });
  }

  console.log(
    `Updated ${totalUpdated} documents for namespace ${namespace.id}`,
  );
}

console.log("Done!");
