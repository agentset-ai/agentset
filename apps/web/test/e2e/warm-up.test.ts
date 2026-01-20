/**
 * Warm-up API E2E Tests
 *
 * Endpoints:
 * - POST /api/v1/namespace/{namespaceId}/warm-up - Warm vector store cache
 *
 * Note: Only Turbopuffer vector stores support this operation.
 * For other vector stores, the endpoint returns 400 "not supported".
 */

import { describe, it, expect } from "vitest";
import {
  BASE_URL,
  NAMESPACE_ID,
  NONEXISTENT_NAMESPACE_ID,
  authHeaders,
  errorResponseSchema,
  warmUpResponseSchema,
} from "./setup";

describe("Warm-up API", () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/namespace/{namespaceId}/warm-up - Warm cache
  // ─────────────────────────────────────────────────────────────────────────────

  describe("POST /api/v1/namespace/{namespaceId}/warm-up", () => {
    it("should warm cache or return 400 if not supported", async () => {
      // Note: The test namespace may not use Turbopuffer, so we accept both
      // 200 (success) and 400 (not supported) as valid responses
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/warm-up`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      // Accept either success (200) or "not supported" (400)
      expect([200, 400]).toContain(response.status);

      const json = await response.json();

      if (response.status === 200) {
        const parsed = warmUpResponseSchema.safeParse(json);
        expect(parsed.success).toBe(true);
        if (parsed.success) {
          expect(parsed.data.data.status).toBe(true);
        }
      } else {
        // 400 - not supported for this vector store
        const parsed = errorResponseSchema.safeParse(json);
        expect(parsed.success).toBe(true);
        const errorJson = json as { error: { code: string; message: string } };
        expect(errorJson.error.code).toBe("bad_request");
        expect(errorJson.error.message).toContain("not supported");
      }
    });

    it("should return 401 without API key", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/warm-up`,
        {
          method: "POST",
        }
      );

      expect(response.status).toBe(401);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });

    it("should return 401 for non-existent namespace", async () => {
      // Note: Non-existent namespaces return 401 (unauthorized) rather than 404
      // because the auth check happens before existence check
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NONEXISTENT_NAMESPACE_ID}/warm-up`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      expect(response.status).toBe(401);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });
  });
});
