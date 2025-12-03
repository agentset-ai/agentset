import { db } from "@agentset/db/client";

const namespaces = await db.namespace.findMany({
  select: {
    id: true,
  },
});

console.log(`Found ${namespaces.length} namespaces`);
let i = 0;
for (const namespace of namespaces) {
  let lastUpdated = null;
  let totalUpdated = 0;
  const limit = 6000;
  while (lastUpdated === null || lastUpdated > limit) {
    const result = await db.document.updateMany({
      where: { ingestJob: { namespaceId: namespace.id }, namespaceId: null },
      data: { namespaceId: namespace.id },
      limit: limit + 1,
    });
    totalUpdated += result.count;
    lastUpdated = result.count;
  }

  console.log(
    `[${++i} / ${namespaces.length}] Updated ${totalUpdated} documents for namespace ${namespace.id}`,
  );
}

console.log("Done!");
