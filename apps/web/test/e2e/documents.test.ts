/**
 * Documents API E2E Tests
 *
 * Endpoints:
 * - GET    /api/v1/namespace/{namespaceId}/documents              - List documents
 * - GET    /api/v1/namespace/{namespaceId}/documents/{documentId} - Get document
 * - DELETE /api/v1/namespace/{namespaceId}/documents/{documentId} - Delete document
 */

import { describe, it, expect } from "vitest";
import {
  BASE_URL,
  NAMESPACE_ID,
  FAKE_DOCUMENT_ID,
  NONEXISTENT_DOCUMENT_ID,
  authHeaders,
  paginatedDocumentsResponseSchema,
  documentResponseSchema,
  errorResponseSchema,
} from "./setup";

describe("Documents API", () => {
  let existingDocumentId: string;

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/namespace/{namespaceId}/documents - List documents
  // ─────────────────────────────────────────────────────────────────────────────

  describe("GET /api/v1/namespace/{namespaceId}/documents", () => {
    it("should return documents list with pagination", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/documents`,
        {
          headers: authHeaders(),
        }
      );

      expect(response.status).toBe(200);

      const json = await response.json();
      const parsed = paginatedDocumentsResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(Array.isArray(parsed.data.data)).toBe(true);
        expect(parsed.data.pagination).toBeDefined();
        expect(typeof parsed.data.pagination.hasMore).toBe("boolean");

        // Save a document ID for later tests
        const firstDoc = parsed.data.data[0];
        if (firstDoc) {
          existingDocumentId = firstDoc.id;
        }
      }
    });

    it("should return 401 without API key", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/documents`
      );

      expect(response.status).toBe(401);
    });

    it("should filter documents by ingestJobId", async () => {
      // First, get all documents to find an ingestJobId
      const listResponse = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/documents`,
        {
          headers: authHeaders(),
        }
      );

      const listJson = (await listResponse.json()) as {
        success: boolean;
        data: Array<{ ingestJobId: string }>;
      };
      if (!listJson.success || listJson.data.length === 0) {
        console.log("[SKIP] No documents found to filter by ingestJobId");
        return;
      }

      const firstDoc = listJson.data[0];
      if (!firstDoc) {
        console.log("[SKIP] First document is undefined");
        return;
      }

      const ingestJobId = firstDoc.ingestJobId;

      // Now filter by that ingestJobId
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/documents?ingestJobId=${ingestJobId}`,
        {
          headers: authHeaders(),
        }
      );

      expect(response.status).toBe(200);

      const json = (await response.json()) as {
        success: boolean;
        data: Array<{ ingestJobId: string }>;
      };
      expect(json.success).toBe(true);

      // All returned documents should have the same ingestJobId
      for (const doc of json.data) {
        expect(doc.ingestJobId).toBe(ingestJobId);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/namespace/{namespaceId}/documents/{documentId} - Get document
  // ─────────────────────────────────────────────────────────────────────────────

  describe("GET /api/v1/namespace/{namespaceId}/documents/{documentId}", () => {
    it("should return document details", async () => {
      // Skip if no document was found in previous test
      if (!existingDocumentId) {
        console.log("[SKIP] No document ID available - previous test may have failed or no documents exist");
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/documents/${existingDocumentId}`,
        {
          headers: authHeaders(),
        }
      );

      expect(response.status).toBe(200);

      const json = await response.json();
      const parsed = documentResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.data.id).toBe(existingDocumentId);
      }
    });

    it("should return 401 without API key", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/documents/${FAKE_DOCUMENT_ID}`
      );

      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent document", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/documents/${NONEXISTENT_DOCUMENT_ID}`,
        {
          headers: authHeaders(),
        }
      );

      expect(response.status).toBe(404);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE /api/v1/namespace/{namespaceId}/documents/{documentId} - Delete document
  // Note: We only test error cases to avoid deleting test data
  // ─────────────────────────────────────────────────────────────────────────────

  describe("DELETE /api/v1/namespace/{namespaceId}/documents/{documentId}", () => {
    it("should return 401 without API key", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/documents/${FAKE_DOCUMENT_ID}`,
        {
          method: "DELETE",
        }
      );

      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent document", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/documents/${NONEXISTENT_DOCUMENT_ID}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      expect(response.status).toBe(404);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });
  });
});
