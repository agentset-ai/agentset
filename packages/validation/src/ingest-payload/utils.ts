import { z } from "zod/v4";

export const fileNameSchema = z
  .string()
  .describe("The name of the file.")
  .nullable()
  .optional();
