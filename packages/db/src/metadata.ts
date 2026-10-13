import type { MetadataFilter, MetadataValue } from "@agentset/validation";

import { Prisma } from "../generated/client";

const numericOperators = {
  $gt: Prisma.sql`>`,
  $gte: Prisma.sql`>=`,
  $lt: Prisma.sql`<`,
  $lte: Prisma.sql`<=`,
};

const combine = (conditions: Prisma.Sql[], operator: "AND" | "OR") =>
  conditions.length === 0
    ? Prisma.sql`TRUE`
    : Prisma.sql`(${Prisma.join(conditions, ` ${operator} `)})`;

const equal = (field: Prisma.Sql, value: MetadataValue) =>
  Prisma.sql`COALESCE(${field} = ${JSON.stringify(value)}::jsonb, FALSE)`;

const membership = (field: Prisma.Sql, values: MetadataValue[]) =>
  combine(
    values.map(
      (value) => Prisma.sql`(
        ${equal(field, value)} OR
        COALESCE(jsonb_typeof(${field}) = 'array' AND
          ${field} @> ${JSON.stringify([value])}::jsonb, FALSE)
      )`,
    ),
    "OR",
  );

/** Compile a validated filter against a trusted JSONB metadata expression. */
export const metadataFilterToSql = (
  filter: MetadataFilter,
  metadata: Prisma.Sql,
): Prisma.Sql => {
  const conditions = Object.entries(filter).map(([key, condition]) => {
    switch (key) {
      case "$and":
        return combine(
          (condition as MetadataFilter[]).map((branch) =>
            metadataFilterToSql(branch, metadata),
          ),
          "AND",
        );
      case "$or":
      case "$nor": {
        const predicate = combine(
          (condition as MetadataFilter[]).map((branch) =>
            metadataFilterToSql(branch, metadata),
          ),
          "OR",
        );
        return key === "$nor" ? Prisma.sql`NOT ${predicate}` : predicate;
      }
      case "$not":
        return Prisma.sql`NOT ${metadataFilterToSql(condition as MetadataFilter, metadata)}`;
    }

    const field = Prisma.sql`((${metadata}) -> ${key}::text)`;
    if (typeof condition !== "object" || Array.isArray(condition)) {
      return equal(field, condition as MetadataValue);
    }

    return combine(
      Object.entries(condition).map(([operator, value]) => {
        switch (operator) {
          case "$eq":
            return equal(field, value as MetadataValue);
          case "$ne":
            return Prisma.sql`NOT (${equal(field, value as MetadataValue)})`;
          case "$gt":
          case "$gte":
          case "$lt":
          case "$lte":
            // CASE prevents casts of strings, booleans, arrays, and missing keys.
            return Prisma.sql`CASE WHEN jsonb_typeof(${field}) = 'number'
              THEN (${field} #>> '{}')::numeric ${numericOperators[operator]} ${value}::numeric
              ELSE FALSE END`;
          case "$in":
            return membership(field, value as MetadataValue[]);
          case "$nin":
            return Prisma.sql`NOT ${membership(field, value as MetadataValue[])}`;
          case "$all":
            return Prisma.sql`COALESCE(jsonb_typeof(${field}) = 'array' AND
              ${field} @> ${JSON.stringify(value)}::jsonb, FALSE)`;
          case "$exists": {
            const exists = Prisma.sql`COALESCE((${metadata}) ? ${key}::text, FALSE)`;
            return value ? exists : Prisma.sql`NOT (${exists})`;
          }
          default:
            throw new Error(`Unsupported metadata operator: ${operator}`);
        }
      }),
      "AND",
    );
  });

  return combine(conditions, "AND");
};
