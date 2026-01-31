/**
 * Search API E2E Tests
 *
 * Endpoints:
 * - POST /api/v1/namespace/{namespaceId}/search - Search namespace
 */

import { describe, it, expect } from "vitest";
import {
  BASE_URL,
  NAMESPACE_ID,
  jsonHeaders,
  searchResponseSchema,
  errorResponseSchema,
} from "./setup";

describe("Search API", () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/namespace/{namespaceId}/search - Search namespace
  // ─────────────────────────────────────────────────────────────────────────────

  describe("POST /api/v1/namespace/{namespaceId}/search", () => {
    it("should return search results", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/search`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({ query: "test" }),
        }
      );

      expect(response.status).toBe(200);

      const json = await response.json();
      const parsed = searchResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(Array.isArray(parsed.data.data)).toBe(true);
        // Each result should have an id and score
        for (const result of parsed.data.data) {
          expect(result.id).toBeDefined();
          expect(typeof result.score).toBe("number");
        }
      }
    });

    it("should return 401 without API key", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "test" }),
        }
      );

      expect(response.status).toBe(401);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });

    it("should respect topK parameter", async () => {
      const topK = 3;

      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/search`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({ query: "test", topK }),
        }
      );

      expect(response.status).toBe(200);

      const json = (await response.json()) as {
        success: boolean;
        data: Array<{ id: string }>;
      };
      expect(json.success).toBe(true);
      expect(json.data.length).toBeLessThanOrEqual(topK);
    });

    it("should work with rerank disabled", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/search`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({ query: "test", rerank: false, topK: 3 }),
        }
      );

      expect(response.status).toBe(200);

      const json = await response.json();
      const parsed = searchResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });

    it("should filter results with filter parameter", async () => {
      // First, do a search to get a documentId
      const initialResponse = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/search`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({ query: "test", topK: 1 }),
        }
      );

      const initialJson = (await initialResponse.json()) as {
        success: boolean;
        data: Array<{ metadata?: { documentId?: string } }>;
      };
      if (!initialJson.success || initialJson.data.length === 0) {
        console.log("[SKIP] No search results to test filter with");
        return;
      }

      const firstResult = initialJson.data[0];
      if (!firstResult?.metadata?.documentId) {
        console.log("[SKIP] No documentId in search result metadata");
        return;
      }

      const documentId = firstResult.metadata.documentId;

      // Now search with filter
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/search`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            query: "test",
            filter: { documentId },
          }),
        }
      );

      expect(response.status).toBe(200);

      const json = (await response.json()) as {
        success: boolean;
        data: Array<{ metadata?: { documentId?: string } }>;
      };
      expect(json.success).toBe(true);

      // All results should have the same documentId
      for (const result of json.data) {
        expect(result.metadata?.documentId).toBe(documentId);
      }
    });

    it("should return 422 with missing query", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/search`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({}),
        }
      );

      expect(response.status).toBe(422);
    });
  });
});
