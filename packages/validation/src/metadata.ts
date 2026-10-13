import { z } from "zod/v4";

const metadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

export const metadataSchema = z.record(z.string(), metadataValueSchema);

const reservedMetadataKeys = new Set([
  "documentId",
  "namespaceId",
  "tenantId",
  "id",
  "text",
  "vector",
  "document_id",
  "doc_id",
  "ref_doc_id",
  "sequence_number",
]);

export const metadataPatchSchema = metadataSchema
  .superRefine((metadata, ctx) => {
    if (Object.keys(metadata).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Provide at least one metadata key.",
      });
    }
    for (const key of Object.keys(metadata)) {
      if (key.startsWith("_") || reservedMetadataKeys.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `Metadata key "${key}" is reserved.`,
        });
      }
    }
  })
  .meta({
    id: "metadata-patch",
    description:
      "Metadata keys to merge into each match. Values may be strings, numbers, booleans, or arrays of strings. Internal keys beginning with _, documentId, namespaceId, tenantId, id, text, vector, document_id, doc_id, ref_doc_id, and sequence_number are reserved.",
  });

const membershipValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const metadataOperatorsSchema = z
  .strictObject({
    $eq: metadataValueSchema.optional(),
    $ne: metadataValueSchema.optional(),
    $gt: z.number().optional(),
    $gte: z.number().optional(),
    $lt: z.number().optional(),
    $lte: z.number().optional(),
    $in: z.array(membershipValueSchema).min(1).optional(),
    $nin: z.array(membershipValueSchema).min(1).optional(),
    $all: z.array(z.string()).min(1).optional(),
    $exists: z.boolean().optional(),
  })
  .refine(
    (operators) =>
      Object.values(operators).some((value) => value !== undefined),
    {
      message: "Provide at least one metadata operator.",
    },
  );

export type MetadataValue = z.infer<typeof metadataValueSchema>;
export type MetadataPatch = z.infer<typeof metadataPatchSchema>;
type MetadataOperators = z.infer<typeof metadataOperatorsSchema>;

export interface MetadataFilter {
  $and?: MetadataFilter[];
  $or?: MetadataFilter[];
  $nor?: MetadataFilter[];
  $not?: MetadataFilter;
  [key: string]:
    | MetadataValue
    | MetadataOperators
    | MetadataFilter
    | MetadataFilter[]
    | undefined;
}

const logicalOperators = new Set(["$and", "$or", "$nor", "$not"]);

export const metadataFilterSchema: z.ZodType<MetadataFilter> = z
  .object({
    $and: z
      .array(z.lazy(() => metadataFilterBranchSchema))
      .min(1)
      .optional(),
    $or: z
      .array(z.lazy(() => metadataFilterBranchSchema))
      .min(1)
      .optional(),
    $nor: z
      .array(z.lazy(() => metadataFilterBranchSchema))
      .min(1)
      .optional(),
    $not: z.lazy(() => metadataFilterBranchSchema).optional(),
  })
  .catchall(z.union([metadataValueSchema, metadataOperatorsSchema]))
  .superRefine((filter, ctx) => {
    for (const key of Object.keys(filter)) {
      if (key.startsWith("$") && !logicalOperators.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `Unknown metadata logical operator "${key}".`,
        });
      }
    }
  })
  .meta({
    id: "metadata-filter",
    description:
      "Match metadata with implicit equality or $eq, $ne, numeric $gt/$gte/$lt/$lte, $in/$nin, $all, and $exists. Combine conditions with $and, $or, $nor, or $not. Array equality is exact; $in matches scalars or array members, and $all matches arrays containing every value. $ne and $nin include missing keys; $exists checks key presence. An explicit empty object matches all records.",
  });

const metadataFilterBranchSchema = metadataFilterSchema.refine(
  (filter) => Object.keys(filter).length > 0,
  { message: "Logical branches must contain at least one condition." },
);
