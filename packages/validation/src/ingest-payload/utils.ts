import { z } from "zod/v4";

export const fileNameSchema = z
  .string()
  .describe("The name of the file.")
  .nullable()
  .optional();

export const unavailableInRegion = <T extends z.ZodType>(
  schema: T,
  source: string,
) =>
  schema.refine(
    () => false,
    `${source} ingestion is not available in this region.`,
  );
