import { z } from "zod/v4";

/**
 * Wraps a schema in the standard API success response format
 * { success: true, data: T }
 */
export function apiSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}
