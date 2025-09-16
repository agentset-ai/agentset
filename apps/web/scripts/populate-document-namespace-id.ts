import { db } from "@agentset/db";

const namespaces = await db.namespace.findMany({
  select: {
    id: true,
  },
});

console.log(`Found ${namespaces.length} namespaces`);
for (const namespace of namespaces) {
  const result = await db.document.updateMany({
    where: { ingestJob: { namespaceId: namespace.id } },
    data: { namespaceId: namespace.id },
  });

  console.log(
    `Updated ${result.count} documents for namespace ${namespace.id}`,
  );
}

console.log("Done!");
