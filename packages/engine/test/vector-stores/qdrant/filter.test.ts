import { describe, expect, it } from "vitest";

import {
  QdrantFilterTranslator,
  type QdrantVectorFilter,
} from "../../../src/vector-store/qdrant/filter";

describe("QdrantFilterTranslator", () => {
  const translator = new QdrantFilterTranslator();

  it("returns undefined for empty filters", () => {
    expect(translator.translate(undefined)).toBeUndefined();
    expect(translator.translate(null as unknown as QdrantVectorFilter)).toBeUndefined();
    expect(translator.translate({} as QdrantVectorFilter)).toBeUndefined();
  });

  it("translates equality filters", () => {
    expect(translator.translate({ field: "value" })).toEqual({
      must: {
        key: "field",
        match: { value: "value" },
      },
    });
  });

  it("translates range filters", () => {
    expect(
      translator.translate({
        score: { $gte: 0.5, $lt: 0.9 },
      }),
    ).toEqual({
      must: {
        key: "score",
        range: { gte: 0.5, lt: 0.9 },
      },
    });
  });

  it("translates $in filters", () => {
    expect(
      translator.translate({
        tags: { $in: ["a", "b"] },
      }),
    ).toEqual({
      must: {
        key: "tags",
        match: { any: ["a", "b"] },
      },
    });
  });

  it("translates $nin filters", () => {
    expect(
      translator.translate({
        tags: { $nin: ["a", "b"] },
      }),
    ).toEqual({
      must_not: {
        key: "tags",
        match: { any: ["a", "b"] },
      },
    });
  });

  it("translates $all filters", () => {
    expect(
      translator.translate({
        tags: { $all: ["a", "b"] },
      }),
    ).toEqual({
      must: [
        { key: "tags", match: { value: "a" } },
        { key: "tags", match: { value: "b" } },
      ],
    });
  });

  it("translates nested fields", () => {
    expect(
      translator.translate({
        "metadata.nested": 10,
      } as QdrantVectorFilter),
    ).toEqual({
      must: {
        key: "metadata.nested",
        match: { value: 10 },
      },
    });
  });

  it("translates $exists filters", () => {
    expect(
      translator.translate({
        field: { $exists: true },
      }),
    ).toEqual({
      must: {
        key: "field",
        is_null: false,
      },
    });
  });

  it("translates $or filters", () => {
    expect(
      translator.translate({
        $or: [{ status: "active" }, { status: "pending" }],
      }),
    ).toEqual({
      should: [
        {
          must: {
            key: "status",
            match: { value: "active" },
          },
        },
        {
          must: {
            key: "status",
            match: { value: "pending" },
          },
        },
      ],
    });
  });

  it("combines field filters with $or", () => {
    expect(
      translator.translate({
        tenantId: "tenant",
        $or: [{ status: "active" }, { status: "pending" }],
      }),
    ).toEqual({
      must: {
        key: "tenantId",
        match: { value: "tenant" },
      },
      should: [
        {
          must: {
            key: "status",
            match: { value: "active" },
          },
        },
        {
          must: {
            key: "status",
            match: { value: "pending" },
          },
        },
      ],
    });
  });
});
