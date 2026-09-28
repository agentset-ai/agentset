import { vi } from "vitest";

/** Imports fresh modules as the given deployment region sees them. */
export const importForRegion = async <T>(
  region: "us" | "eu",
  importModules: () => Promise<T>,
): Promise<T> => {
  vi.resetModules();
  // the schemas register their ids again when re-imported
  (
    globalThis as { __zod_globalRegistry?: { clear: () => void } }
  ).__zod_globalRegistry?.clear();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);

  return importModules();
};
