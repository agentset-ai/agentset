import { z } from "zod/v4";

// only in development mode
if (process.env.NODE_ENV === "development") {
  const originalAdd = z.globalRegistry.add;

  // terrible hack for vite's HMR:
  // without this monkey-patch, zod will throw an error whenever editing a schema file that uses
  // `.register` as it would try to re-register the schema with the same ID again
  // with this patch, re-registering will just replace the schema in the registry
  z.globalRegistry.add = (
    schema: Parameters<typeof originalAdd>[0],
    meta: Parameters<typeof originalAdd>[1],
  ) => {
    if (!meta.id) {
      return originalAdd.call(z.globalRegistry, schema, meta);
    }
    const existingSchema = z.globalRegistry._idmap.get(meta.id);
    if (existingSchema) {
      z.globalRegistry.remove(existingSchema);
      z.globalRegistry._idmap.delete(meta.id);
    }
    return originalAdd.call(z.globalRegistry, schema, meta);
  };
}

export * from "./embedding-model";
export * from "./llm";
export * from "./llm/constants";
export * from "./re-ranker";
export * from "./re-ranker/constants";
export * from "./vector-store";
export * from "./ingest-payload";
export * from "./document-payload";
export * from "./language";
