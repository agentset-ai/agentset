import type { Schemas } from "@qdrant/js-client-rest";

import type {
  BlacklistedRootOperators,
  LogicalOperatorValueMap,
  OperatorSupport,
  OperatorValueMap,
  VectorFilter,
} from "../common/filter";
import { BaseFilterTranslator } from "../common/filter";

type QdrantOperatorValueMap = Omit<
  OperatorValueMap,
  "$regex" | "$options" | "$elemMatch"
>;

type QdrantLogicalOperatorValueMap = Omit<LogicalOperatorValueMap, "$nor">;

type QdrantBlacklisted = BlacklistedRootOperators | "$nor";

export type QdrantVectorFilter = VectorFilter<
  keyof QdrantOperatorValueMap,
  QdrantOperatorValueMap,
  QdrantLogicalOperatorValueMap,
  QdrantBlacklisted
>;

type QdrantFilter = Schemas["Filter"];
type QdrantCondition = Schemas["Condition"];
type QdrantFieldCondition = Schemas["FieldCondition"];

interface TranslatedParts {
  must: QdrantCondition[];
  should: QdrantCondition[];
  must_not: QdrantCondition[];
}

export class QdrantFilterTranslator extends BaseFilterTranslator<
  QdrantVectorFilter,
  QdrantFilter | undefined
> {
  protected override getSupportedOperators(): OperatorSupport {
    return {
      ...BaseFilterTranslator.DEFAULT_OPERATORS,
      logical: ["$and", "$or", "$not"],
      array: ["$in", "$nin", "$all"],
      element: ["$exists"],
      regex: [],
      custom: [],
    };
  }

  translate(filter?: QdrantVectorFilter): QdrantFilter | undefined {
    if (this.isEmpty(filter)) return undefined;
    this.validateFilter(filter);
    const parts = this.translateNode(filter);
    const result = this.partsToFilter(parts);
    if (!result.must && !result.should && !result.must_not) {
      return undefined;
    }
    return result;
  }

  private translateNode(node: QdrantVectorFilter): TranslatedParts {
    if (this.isEmpty(node)) return { must: [], should: [], must_not: [] };

    const entries = Object.entries(node as Record<string, any>);
    if (entries.length === 0) return { must: [], should: [], must_not: [] };

    if (entries.length === 1) {
      const [key, value] = entries[0]!;
      if (this.isLogicalOperator(key)) {
        return this.translateLogicalParts(key, value);
      }
    }

    const must: QdrantCondition[] = [];
    const must_not: QdrantCondition[] = [];

    for (const [key, value] of entries) {
      if (this.isLogicalOperator(key)) {
        const parts = this.translateLogicalParts(key, value);
        must.push(this.partsToFilter(parts) as QdrantCondition);
      } else {
        const { must: fm, must_not: fmn } = this.translateFieldConditions(
          key,
          value,
        );
        must.push(...fm);
        must_not.push(...fmn);
      }
    }

    return { must, should: [], must_not };
  }

  private translateLogicalParts(operator: string, value: any): TranslatedParts {
    if (operator === "$and") {
      if (!Array.isArray(value)) {
        throw new Error("$and requires an array of conditions");
      }
      const conditions = value.map((c) => this.translateNodeToCondition(c));
      return { must: conditions, should: [], must_not: [] };
    }

    if (operator === "$or") {
      if (!Array.isArray(value)) {
        throw new Error("$or requires an array of conditions");
      }
      const conditions = value.map((c) => this.translateNodeToCondition(c));
      return { must: [], should: conditions, must_not: [] };
    }

    if (operator === "$not") {
      const condition = this.translateNodeToCondition(value);
      return { must: [], should: [], must_not: [condition] };
    }

    throw new Error(`Unsupported logical operator: ${operator}`);
  }

  private translateNodeToCondition(node: any): QdrantCondition {
    const parts = this.translateNode(node);
    return this.partsToFilter(parts) as QdrantCondition;
  }

  private partsToFilter(parts: TranslatedParts): QdrantFilter {
    const filter: QdrantFilter = {};
    if (parts.must.length > 0) filter.must = parts.must;
    if (parts.should.length > 0) filter.should = parts.should;
    if (parts.must_not.length > 0) filter.must_not = parts.must_not;
    return filter;
  }

  private translateFieldConditions(
    field: string,
    value: any,
  ): { must: QdrantCondition[]; must_not: QdrantCondition[] } {
    if (this.isPrimitive(value)) {
      return {
        must: [
          {
            key: field,
            match: { value: this.normalizeScalarValue(value) },
          } satisfies QdrantFieldCondition,
        ],
        must_not: [],
      };
    }

    if (value instanceof Date) {
      return {
        must: [
          {
            key: field,
            match: { value: value.toISOString() },
          } satisfies QdrantFieldCondition,
        ],
        must_not: [],
      };
    }

    if (Array.isArray(value)) {
      return {
        must: [
          {
            key: field,
            match: { any: this.normalizeAnyVariants(value) },
          } satisfies QdrantFieldCondition,
        ],
        must_not: [],
      };
    }

    const must: QdrantCondition[] = [];
    const must_not: QdrantCondition[] = [];
    const range: Schemas["Range"] = {};
    const datetimeRange: Schemas["DatetimeRange"] = {};
    let hasNumericRange = false;
    let hasDatetimeRange = false;

    for (const [op, opValue] of Object.entries(value)) {
      switch (op) {
        case "$eq":
          must.push({
            key: field,
            match: { value: this.normalizeScalarValue(opValue) },
          } satisfies QdrantFieldCondition);
          break;

        case "$ne":
          must_not.push({
            key: field,
            match: { value: this.normalizeScalarValue(opValue) },
          } satisfies QdrantFieldCondition);
          break;

        case "$in":
          must.push({
            key: field,
            match: { any: this.normalizeAnyVariants(opValue as any[]) },
          } satisfies QdrantFieldCondition);
          break;

        case "$nin":
          must.push({
            key: field,
            match: { except: this.normalizeAnyVariants(opValue as any[]) },
          } satisfies QdrantFieldCondition);
          break;

        case "$gt":
          if (opValue instanceof Date || typeof opValue === "string") {
            datetimeRange.gt = this.normalizeDatetimeValue(opValue);
            hasDatetimeRange = true;
          } else {
            range.gt = opValue as number;
            hasNumericRange = true;
          }
          break;

        case "$gte":
          if (opValue instanceof Date || typeof opValue === "string") {
            datetimeRange.gte = this.normalizeDatetimeValue(opValue);
            hasDatetimeRange = true;
          } else {
            range.gte = opValue as number;
            hasNumericRange = true;
          }
          break;

        case "$lt":
          if (opValue instanceof Date || typeof opValue === "string") {
            datetimeRange.lt = this.normalizeDatetimeValue(opValue);
            hasDatetimeRange = true;
          } else {
            range.lt = opValue as number;
            hasNumericRange = true;
          }
          break;

        case "$lte":
          if (opValue instanceof Date || typeof opValue === "string") {
            datetimeRange.lte = this.normalizeDatetimeValue(opValue);
            hasDatetimeRange = true;
          } else {
            range.lte = opValue as number;
            hasNumericRange = true;
          }
          break;

        case "$exists":
          if (opValue) {
            must_not.push({ is_empty: { key: field } } as QdrantCondition);
          } else {
            must.push({ is_empty: { key: field } } as QdrantCondition);
          }
          break;

        case "$all":
          for (const v of opValue as any[]) {
            must.push({
              key: field,
              match: { any: [this.normalizeScalarValue(v)] },
            } satisfies QdrantFieldCondition);
          }
          break;

        default:
          throw new Error(`Unsupported operator: ${op}`);
      }
    }

    if (hasNumericRange) {
      must.push({ key: field, range } satisfies QdrantFieldCondition);
    }

    if (hasDatetimeRange) {
      must.push({
        key: field,
        range: datetimeRange as Schemas["RangeInterface"],
      } satisfies QdrantFieldCondition);
    }

    return { must, must_not };
  }

  // Normalize a scalar value to either string | number | boolean
  private normalizeScalarValue(value: any): string | number | boolean {
    if (value instanceof Date) return value.toISOString();
    if (value === null || value === undefined) return "";
    return value as string | number | boolean;
  }

  // Normalize array values for to either string[] | number[]
  private normalizeAnyVariants(values: any[]): string[] | number[] {
    if (values.length === 0) return [];

    const normalized = values.map((v) => {
      if (v instanceof Date) return v.toISOString();
      if (v === null || v === undefined) return "";
      return v;
    });

    if (normalized.every((v) => typeof v === "number")) {
      return normalized;
    }

    return normalized.map((v) => String(v));
  }

  private normalizeDatetimeValue(value: Date | string): string {
    if (value instanceof Date) return value.toISOString();
    return value;
  }
}
