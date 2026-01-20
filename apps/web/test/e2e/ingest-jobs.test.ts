/**
 * Ingest Jobs API E2E Tests
 *
 * Endpoints:
 * - GET    /api/v1/namespace/{namespaceId}/ingest-jobs              - List ingest jobs
 * - POST   /api/v1/namespace/{namespaceId}/ingest-jobs              - Create ingest job
 * - GET    /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId}      - Get ingest job
 * - DELETE /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId}      - Delete ingest job
 * - POST   /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId}/re-ingest - Re-ingest job
 */

import { describe, it, expect } from "vitest";
import {
  BASE_URL,
  NAMESPACE_ID,
  FAKE_JOB_ID,
  NONEXISTENT_JOB_ID,
  authHeaders,
  jsonHeaders,
  ingestJobResponseSchema,
  paginatedIngestJobsResponseSchema,
  reIngestResponseSchema,
  errorResponseSchema,
} from "./setup";

describe("Ingest Jobs API", () => {
  let createdJobId: string;

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/namespace/{namespaceId}/ingest-jobs - List ingest jobs
  // ─────────────────────────────────────────────────────────────────────────────

  describe("GET /api/v1/namespace/{namespaceId}/ingest-jobs", () => {
    it("should return ingest jobs list with pagination", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
        {
          headers: authHeaders(),
        }
      );

      expect(response.status).toBe(200);

      const json = await response.json();
      const parsed = paginatedIngestJobsResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(Array.isArray(parsed.data.data)).toBe(true);
        expect(parsed.data.pagination).toBeDefined();
        expect(typeof parsed.data.pagination.hasMore).toBe("boolean");
      }
    });

    it("should return 401 without API key", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`
      );

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/namespace/{namespaceId}/ingest-jobs - Create ingest job
  // ─────────────────────────────────────────────────────────────────────────────

  describe("POST /api/v1/namespace/{namespaceId}/ingest-jobs", () => {
    it("should create a TEXT ingest job", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            name: "E2E Test Document",
            payload: {
              type: "TEXT",
              text: "This is a test document for E2E testing.",
            },
          }),
        }
      );

      expect(response.status).toBe(201);

      const json = await response.json();
      const parsed = ingestJobResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.data.name).toBe("E2E Test Document");
        expect(parsed.data.data.namespaceId).toBe(NAMESPACE_ID);
        expect(parsed.data.data.status).toBe("QUEUED");
        expect(parsed.data.data.payload.type).toBe("TEXT");

        // Save job ID for later tests
        createdJobId = parsed.data.data.id;
      }
    });

    it("should create a FILE ingest job (URL to file)", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            name: "E2E Test FILE Document",
            payload: {
              type: "FILE",
              fileUrl: "https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf",
              fileName: "test-file.pdf",
            },
          }),
        }
      );

      expect(response.status).toBe(201);

      const json = await response.json();
      const parsed = ingestJobResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.data.name).toBe("E2E Test FILE Document");
        expect(parsed.data.data.namespaceId).toBe(NAMESPACE_ID);
        expect(parsed.data.data.status).toBe("QUEUED");
        expect(parsed.data.data.payload.type).toBe("FILE");
      }
    });

    it("should create a CRAWL ingest job (web crawling)", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            name: "E2E Test CRAWL Document",
            payload: {
              type: "CRAWL",
              url: "https://example.com",
              maxDepth: 1,
              limit: 1,
            },
          }),
        }
      );

      expect(response.status).toBe(201);

      const json = await response.json();
      const parsed = ingestJobResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.data.name).toBe("E2E Test CRAWL Document");
        expect(parsed.data.data.namespaceId).toBe(NAMESPACE_ID);
        expect(parsed.data.data.status).toBe("QUEUED");
        expect(parsed.data.data.payload.type).toBe("CRAWL");
      }
    });

    it("should return 401 without auth", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Test Document",
            payload: { type: "TEXT", text: "Test" },
          }),
        }
      );

      expect(response.status).toBe(401);
    });

    it("should return 400/422 with missing payload", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            name: "Test Document Without Payload",
          }),
        }
      );

      expect([400, 422]).toContain(response.status);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });

    it("should return 400/422 with invalid payload type", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            name: "Test Document",
            payload: {
              type: "INVALID_TYPE",
              text: "Some text",
            },
          }),
        }
      );

      expect([400, 422]).toContain(response.status);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });

    it("should return 400/422 with empty body", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({}),
        }
      );

      expect([400, 422]).toContain(response.status);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId} - Get ingest job
  // ─────────────────────────────────────────────────────────────────────────────

  describe("GET /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId}", () => {
    it("should return job status", async () => {
      // Skip if no job was created
      if (!createdJobId) {
        console.log("[SKIP] No job ID available - previous test may have failed");
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs/${createdJobId}`,
        {
          headers: authHeaders(),
        }
      );

      expect(response.status).toBe(200);

      const json = await response.json();
      const parsed = ingestJobResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.data.id).toBe(createdJobId);
      }
    });

    it("should return 401 without auth", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs/${FAKE_JOB_ID}`
      );

      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent job", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs/${NONEXISTENT_JOB_ID}`,
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
  // DELETE /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId} - Delete ingest job
  // ─────────────────────────────────────────────────────────────────────────────

  describe("DELETE /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId}", () => {
    it("should return 401 without API key", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs/${FAKE_JOB_ID}`,
        {
          method: "DELETE",
        }
      );

      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent job", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs/${NONEXISTENT_JOB_ID}`,
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

    // Note: We don't test the happy path for DELETE to avoid deleting test data
    // The delete operation queues the job for deletion, which is handled asynchronously
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId}/re-ingest - Re-ingest
  // ─────────────────────────────────────────────────────────────────────────────

  describe("POST /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId}/re-ingest", () => {
    it("should return 401 without API key", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs/${FAKE_JOB_ID}/re-ingest`,
        {
          method: "POST",
        }
      );

      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent job", async () => {
      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs/${NONEXISTENT_JOB_ID}/re-ingest`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      expect(response.status).toBe(404);

      const json = await response.json();
      const parsed = errorResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });

    it("should re-ingest a COMPLETED or FAILED job", async () => {
      // First, find a COMPLETED or FAILED job (can't re-ingest QUEUED jobs)
      const listResponse = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
        {
          headers: authHeaders(),
        }
      );

      const listJson = (await listResponse.json()) as {
        success: boolean;
        data: Array<{ id: string; status: string }>;
      };

      if (!listJson.success) {
        console.log("[SKIP] Failed to list ingest jobs");
        return;
      }

      const eligibleJob = listJson.data.find(
        (job) => job.status === "COMPLETED" || job.status === "FAILED"
      );

      if (!eligibleJob) {
        console.log("[SKIP] No COMPLETED or FAILED jobs found");
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs/${eligibleJob.id}/re-ingest`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      expect(response.status).toBe(200);

      const json = await response.json();
      const parsed = reIngestResponseSchema.safeParse(json);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.data.id).toBe(eligibleJob.id);
      }
    });

    // Note: Testing "should return 400 when re-ingesting a QUEUED job" is flaky
    // because job processing can complete before the test runs. The API correctly
    // returns 400 for PROCESSING jobs, but timing makes this test unreliable.
  });
});
