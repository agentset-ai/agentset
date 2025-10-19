import type { Schemas } from "@qdrant/js-client-rest";

import type {
  BlacklistedRootOperators,
  LogicalOperatorValueMap,
  OperatorSupport,
  OperatorValueMap,
  VectorFilter,
} from "../common/filter";
import { BaseFilterTranslator } from "../common/filter";

type Filter = Schemas["Filter"];
type Condition = Schemas["Condition"];
type FieldCondition = Schemas["FieldCondition"];

type QdrantOperatorValueMap = Omit<
  OperatorValueMap,
  "$regex" | "$options" | "$elemMatch"
>;

type QdrantLogicalOperatorValueMap = Pick<
  LogicalOperatorValueMap,
  "$and" | "$or"
>;

type QdrantBlacklistedRootOperators = BlacklistedRootOperators | "$nor" | "$not";

export type QdrantVectorFilter = VectorFilter<
  keyof QdrantOperatorValueMap,
  QdrantOperatorValueMap,
  QdrantLogicalOperatorValueMap,
  QdrantBlacklistedRootOperators
>;

type NormalizedFilter = {
  must: Condition[];
  mustNot: Condition[];
  should: Condition[];
};

const isNonNullObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export class QdrantFilterTranslator extends BaseFilterTranslator<
  QdrantVectorFilter,
  Filter | undefined
> {
  protected override getSupportedOperators(): OperatorSupport {
    return {
      ...BaseFilterTranslator.DEFAULT_OPERATORS,
      logical: ["$and", "$or"],
      array: ["$in", "$nin", "$all"],
      element: ["$exists"],
      regex: [],
      custom: [],
    };
  }

  translate(filter?: QdrantVectorFilter): Filter | undefined {
    if (this.isEmpty(filter)) return undefined;

    this.validateFilter(filter);
    const normalized = this.translateNode(filter);

    if (
      normalized.must.length === 0 &&
      normalized.mustNot.length === 0 &&
      normalized.should.length === 0
    ) {
      return undefined;
    }

    return this.normalizedToFilter(normalized);
  }

  private translateNode(node: QdrantVectorFilter): NormalizedFilter {
    const result = this.createNormalized();

    if (node === null || node === undefined) {
      return result;
    }

    if (Array.isArray(node)) {
      // Arrays should only appear within logical operators, treat as implicit $and
      for (const item of node) {
        this.mergeNormalized(result, this.translateNode(item));
      }
      return result;
    }

    if (!isNonNullObject(node)) return result;

    for (const [key, value] of Object.entries(node)) {
    if (this.isLogicalOperator(key)) {
      if (key === "$and" || key === "$or") {
        const logicalResult = this.translateLogical(key, value);
        this.mergeNormalized(result, logicalResult);
        continue;
      }

      throw new Error(`Unsupported logical operator: ${key}`);
    }

      const fieldResult = this.translateField(key, value);
      this.mergeNormalized(result, fieldResult);
    }

    return result;
  }

  private translateLogical(
    operator: "$and" | "$or",
    value: unknown,
  ): NormalizedFilter {
    const result = this.createNormalized();

    const branches = Array.isArray(value) ? value : [value];

    if (operator === "$and") {
      for (const branch of branches) {
        this.mergeNormalized(result, this.translateNode(branch));
      }
      return result;
    }

    for (const branch of branches) {
      const normalizedBranch = this.translateNode(branch);
      const condition = this.normalizedToCondition(normalizedBranch);
      if (condition) {
        result.should.push(condition);
      }
    }

    return result;
  }

  private translateField(field: string, value: unknown): NormalizedFilter {
    const result = this.createNormalized();

    if (this.isPrimitive(value)) {
      result.must.push(this.createMatchCondition(field, value));
      return result;
    }

    if (Array.isArray(value)) {
      this.mergeNormalized(result, this.createInCondition(field, value));
      return result;
    }

    if (!isNonNullObject(value)) {
      return result;
    }

    const entries = Object.entries(value);
    const hasOperators = entries.some(([key]) => this.isOperator(key));

    if (!hasOperators) {
      for (const [subKey, subValue] of entries) {
        this.mergeNormalized(
          result,
          this.translateField(`${field}.${subKey}`, subValue),
        );
      }
      return result;
    }

    const range: Partial<Record<"gt" | "gte" | "lt" | "lte", number | string>> =
      {};

    for (const [operator, operatorValue] of entries) {
      if (!this.isOperator(operator)) {
        this.mergeNormalized(
          result,
          this.translateField(`${field}.${operator}`, operatorValue),
        );
        continue;
      }

      switch (operator) {
        case "$eq": {
          if (operatorValue === null) {
            result.must.push(this.createNullCondition(field, true));
          } else {
            result.must.push(
              this.createMatchCondition(field, operatorValue),
            );
          }
          break;
        }

        case "$ne": {
          if (operatorValue === null) {
            result.mustNot.push(this.createNullCondition(field, true));
          } else {
            result.mustNot.push(
              this.createMatchCondition(field, operatorValue),
            );
          }
          break;
        }

        case "$in": {
          if (!Array.isArray(operatorValue)) {
            throw new Error("$in operator requires an array");
          }
          this.mergeNormalized(
            result,
            this.createInCondition(field, operatorValue),
          );
          break;
        }

        case "$nin": {
          if (!Array.isArray(operatorValue)) {
            throw new Error("$nin operator requires an array");
          }
          const condition = this.createMatchAnyCondition(
            field,
            operatorValue,
            "must_not",
          );
          this.mergeNormalized(result, condition);
          break;
        }

        case "$all": {
          if (!Array.isArray(operatorValue)) {
            throw new Error("$all operator requires an array");
          }
          for (const item of operatorValue) {
            result.must.push(this.createMatchCondition(field, item));
          }
          break;
        }

        case "$exists": {
          if (typeof operatorValue !== "boolean") {
            throw new Error("$exists operator requires a boolean");
          }
          result.must.push(this.createNullCondition(field, !operatorValue));
          break;
        }

        case "$gt":
        case "$gte":
        case "$lt":
        case "$lte": {
          const normalized = this.normalizeComparisonValue(operatorValue);
          const key = operator.slice(1) as keyof typeof range;
          range[key] = normalized as number | string;
          break;
        }

        default: {
          throw new Error(`Unsupported operator: ${operator}`);
        }
      }
    }

    if (Object.keys(range).length > 0) {
      result.must.push(this.createRangeCondition(field, range));
    }

    return result;
  }

  private createNormalized(): NormalizedFilter {
    return {
      must: [],
      mustNot: [],
      should: [],
    };
  }

  private mergeNormalized(
    target: NormalizedFilter,
    source: NormalizedFilter,
  ): void {
    target.must.push(...source.must);
    target.mustNot.push(...source.mustNot);
    target.should.push(...source.should);
  }

  private createMatchCondition(field: string, value: unknown): Condition {
    const normalized = this.normalizeComparisonValue(value);

    if (normalized === null || normalized === undefined) {
      return this.createNullCondition(field, true);
    }

    if (
      typeof normalized !== "string" &&
      typeof normalized !== "number" &&
      typeof normalized !== "boolean"
    ) {
      throw new Error(
        `Unsupported value type for match condition on ${field}: ${typeof normalized}`,
      );
    }

    return {
      key: field,
      match: { value: normalized },
    } satisfies FieldCondition;
  }

  private createNullCondition(field: string, isNull: boolean): Condition {
    return {
      key: field,
      is_null: isNull,
    } satisfies FieldCondition;
  }

  private createRangeCondition(
    field: string,
    range: Partial<Record<"gt" | "gte" | "lt" | "lte", number | string>>,
  ): Condition {
    return {
      key: field,
      range,
    } satisfies FieldCondition;
  }

  private createInCondition(
    field: string,
    values: unknown[],
  ): NormalizedFilter {
    return this.createMatchAnyCondition(field, values, "must");
  }

  private createMatchAnyCondition(
    field: string,
    values: unknown[],
    mode: "must" | "must_not",
  ): NormalizedFilter {
    const result = this.createNormalized();
    if (values.length === 0) {
      // Empty array means no values should match
      if (mode === "must") {
        // Contradiction - nothing can satisfy this condition, but we can't express it directly.
        // Fall back to a condition that can never be true.
        result.mustNot.push({
          key: field,
          match: { any: ["__never_matches__"] },
        } satisfies FieldCondition);
      }
      return result;
    }

    const normalizedValues = this.normalizeArrayValues(values).map((value) =>
      this.normalizeComparisonValue(value),
    );

    const strings = normalizedValues.filter(
      (value): value is string => typeof value === "string",
    );
    const numbers = normalizedValues.filter(
      (value): value is number => typeof value === "number",
    );
    const booleans = normalizedValues.filter(
      (value): value is boolean => typeof value === "boolean",
    );

    if (strings.length > 0) {
      const condition: FieldCondition = {
        key: field,
        match: { any: strings },
      };
      mode === "must" ? result.must.push(condition) : result.mustNot.push(condition);
    }

    if (numbers.length > 0) {
      const condition: FieldCondition = {
        key: field,
        match: { any: numbers },
      };
      mode === "must" ? result.must.push(condition) : result.mustNot.push(condition);
    }

    if (booleans.length > 0) {
      for (const value of booleans) {
        const condition = this.createMatchCondition(field, value);
        if (mode === "must") {
          result.should.push(condition);
        } else {
          result.mustNot.push(condition);
        }
      }
    }

    return result;
  }

  private normalizedToCondition(
    normalized: NormalizedFilter,
  ): Condition | undefined {
    if (
      normalized.must.length === 0 &&
      normalized.mustNot.length === 0 &&
      normalized.should.length === 0
    ) {
      return undefined;
    }

    return this.normalizedToFilter(normalized);
  }

  private normalizedToFilter(normalized: NormalizedFilter): Filter {
    const filter: Filter = {};

    if (normalized.must.length === 1) {
      filter.must = normalized.must[0];
    } else if (normalized.must.length > 1) {
      filter.must = normalized.must;
    }

    if (normalized.mustNot.length === 1) {
      filter.must_not = normalized.mustNot[0];
    } else if (normalized.mustNot.length > 1) {
      filter.must_not = normalized.mustNot;
    }

    if (normalized.should.length === 1) {
      filter.should = normalized.should[0];
    } else if (normalized.should.length > 1) {
      filter.should = normalized.should;
    }

    return filter;
  }
}
