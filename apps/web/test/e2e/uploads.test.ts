/**
 * Uploads API E2E Tests
 *
 * Endpoints:
 * - POST /api/v1/namespace/{namespaceId}/uploads - Create presigned upload URL
 * - POST /api/v1/namespace/{namespaceId}/uploads/batch - Create batch presigned upload URLs
 */

import { describe, it, expect } from "vitest";
import {
  BASE_URL,
  NAMESPACE_ID,
  jsonHeaders,
  errorResponseSchema,
  uploadResponseSchema,
  batchUploadResponseSchema,
} from "./setup";

describe("Uploads API", () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/namespace/{namespaceId}/uploads - Create presigned upload URL
  // ─────────────────────────────────────────────────────────────────────────────

  describe("POST /api/v1/namespace/{namespaceId}/uploads", () => {
    it("should return presigned upload URL", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/uploads`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            fileName: "test-document.pdf",
            contentType: "application/pdf",
            fileSize: 1024,
          }),
        }
      );

      expect(response.status).toBe(201);

      const json = await response.json();
      const parsed = uploadResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.data.url).toContain("http");
        expect(parsed.data.data.key).toContain("namespaces/");
        expect(parsed.data.data.key).toContain(".pdf");
      }
    });

    it("should return 401 without API key", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/uploads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: "test-document.pdf",
            contentType: "application/pdf",
            fileSize: 1024,
          }),
        }
      );

      expect(response.status).toBe(401);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });

    it("should return 422 with missing required fields", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/uploads`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            fileName: "test-document.pdf",
            // Missing contentType and fileSize
          }),
        }
      );

      expect(response.status).toBe(422);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/namespace/{namespaceId}/uploads/batch - Create batch upload URLs
  // ─────────────────────────────────────────────────────────────────────────────

  describe("POST /api/v1/namespace/{namespaceId}/uploads/batch", () => {
    it("should return batch presigned upload URLs", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/uploads/batch`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            files: [
              {
                fileName: "document1.pdf",
                contentType: "application/pdf",
                fileSize: 1024,
              },
              {
                fileName: "document2.pdf",
                contentType: "application/pdf",
                fileSize: 2048,
              },
            ],
          }),
        }
      );

      expect(response.status).toBe(201);

      const json = await response.json();
      const parsed = batchUploadResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.data).toHaveLength(2);
        for (const result of parsed.data.data) {
          expect(result.url).toContain("http");
          expect(result.key).toContain("namespaces/");
          expect(result.key).toContain(".pdf");
        }
      }
    });

    it("should return 401 without API key", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/uploads/batch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: [
              {
                fileName: "document.pdf",
                contentType: "application/pdf",
                fileSize: 1024,
              },
            ],
          }),
        }
      );

      expect(response.status).toBe(401);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });

    it("should return 422 with empty files array", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/uploads/batch`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            files: [],
          }),
        }
      );

      expect(response.status).toBe(422);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });
  });
});
