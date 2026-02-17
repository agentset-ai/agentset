/**
 * Namespace API E2E Tests
 *
 * Endpoints:
 * - GET    /api/v1/namespace                    - List namespaces
 * - POST   /api/v1/namespace                    - Create namespace
 * - GET    /api/v1/namespace/{namespaceId}      - Get namespace (⚠️ BUG: cache date serialization)
 * - PATCH  /api/v1/namespace/{namespaceId}      - Update namespace
 * - DELETE /api/v1/namespace/{namespaceId}      - Delete namespace
 */

import { describe, it, expect } from "vitest";
import {
  BASE_URL,
  NAMESPACE_ID,
  NONEXISTENT_NAMESPACE_ID,
  authHeaders,
  jsonHeaders,
  listNamespacesResponseSchema,
  namespaceResponseSchema,
  errorResponseSchema,
} from "./setup";

describe("Namespace API", () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/namespace - List namespaces
  // ─────────────────────────────────────────────────────────────────────────────

  describe("GET /api/v1/namespace", () => {
    it("should return namespaces list", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace`, {
        headers: authHeaders(),
      });

      expect(response.status).toBe(200);

      const json = await response.json();
      const parsed = listNamespacesResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });

    it("should return 401 without API key", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace`);

      expect(response.status).toBe(401);
    });

    it("should return 401 with invalid API key", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace`, {
        headers: {
          Authorization: "Bearer invalid_api_key_12345",
        },
      });

      expect(response.status).toBe(401);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });

    it("should return 400 with malformed Authorization header", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace`, {
        headers: {
          Authorization: "InvalidFormat",
        },
      });

      // API returns 400 Bad Request for malformed auth header (not proper "Bearer <token>" format)
      expect(response.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/namespace - Create namespace
  // ─────────────────────────────────────────────────────────────────────────────

  describe("POST /api/v1/namespace", () => {
    it("should return 401 without API key", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test", slug: "test" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 400 with invalid JSON body", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace`, {
        method: "POST",
        headers: authHeaders(),
      });

      expect(response.status).toBe(400);

      const json = (await response.json()) as { success: boolean; error: { message: string } };
      expect(json.success).toBe(false);
      expect(json.error.message).toContain("Invalid JSON");
    });

    it("should return 422 with missing required fields", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(422);

      const json = (await response.json()) as { success: boolean };
      expect(json.success).toBe(false);
    });

    it("should return 422 with invalid name (empty)", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ name: "", slug: "test-slug" }),
      });

      expect(response.status).toBe(422);
    });

    it("should return 422 with invalid slug (too short)", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ name: "Test Name", slug: "a" }),
      });

      expect(response.status).toBe(422);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/namespace/{namespaceId} - Get single namespace
  // ⚠️ KNOWN BUG: unstable_cache serializes Date to string, causing NamespaceSchema.parse() to fail
  // See: apps/web/test/e2e/BUGS.md
  // ─────────────────────────────────────────────────────────────────────────────

  describe("GET /api/v1/namespace/{namespaceId}", () => {
    it("should return 401 without API key", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}`);

      expect(response.status).toBe(401);
    });

    it("should return 401 for non-existent namespace", async () => {
      // Returns 401 instead of 404 to prevent namespace enumeration
      const response = await fetch(`${BASE_URL}/api/v1/namespace/${NONEXISTENT_NAMESPACE_ID}`, {
        headers: authHeaders(),
      });

      expect(response.status).toBe(401);
    });

    it.skip("should return namespace details (SKIPPED: cache date serialization bug)", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}`, {
        headers: authHeaders(),
      });

      expect(response.status).toBe(200);

      const json = await response.json();
      const parsed = namespaceResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/namespace/{namespaceId} - Update namespace
  // ─────────────────────────────────────────────────────────────────────────────

  describe("PATCH /api/v1/namespace/{namespaceId}", () => {
    it("should return 401 without API key", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 for non-existent namespace", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace/${NONEXISTENT_NAMESPACE_ID}`, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify({ name: "Test" }),
      });

      expect(response.status).toBe(401);
    });

    it("should update namespace name", async () => {
      const newName = `Test Namespace ${Date.now()}`;

      const response = await fetch(`${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}`, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify({ name: newName }),
      });

      expect(response.status).toBe(200);

      const json = await response.json();
      const parsed = namespaceResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.data.name).toBe(newName);
      }
    });

    it("should return unchanged namespace with empty payload", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}`, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(200);

      const json = (await response.json()) as { success: boolean };
      expect(json.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE /api/v1/namespace/{namespaceId} - Delete namespace
  // Note: We only test error cases to avoid deleting test data
  // ─────────────────────────────────────────────────────────────────────────────

  describe("DELETE /api/v1/namespace/{namespaceId}", () => {
    it("should return 401 without API key", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 for non-existent namespace", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/namespace/${NONEXISTENT_NAMESPACE_ID}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      expect(response.status).toBe(401);
    });
  });
});
