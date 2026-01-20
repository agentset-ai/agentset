/**
 * Public API E2E Tests
 *
 * Prerequisites:
 * - Server must be running on localhost:3000
 * - Set TEST_API_KEY environment variable for authenticated endpoints
 */

import { describe, it, expect } from "vitest";

/* eslint-disable no-restricted-properties, turbo/no-undeclared-env-vars */
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const API_KEY = process.env.TEST_API_KEY || "";
const NAMESPACE_ID = process.env.TEST_NAMESPACE_ID || "ns_cmkmgags90001uprqtqvjxkdq";
/* eslint-enable no-restricted-properties, turbo/no-undeclared-env-vars */

describe("Health Endpoint", () => {
  it("GET /api/health should return healthy status", async () => {
    const response = await fetch(`${BASE_URL}/api/health`);

    expect(response.status).toBe(200);

    const data = (await response.json()) as { status: string; timing: { total: number }; timestamp: string };

    expect(data).toHaveProperty("status", "healthy");
    expect(data).toHaveProperty("timing");
    expect(data.timing).toHaveProperty("total");
    expect(data).toHaveProperty("timestamp");
  });

  it("POST /api/health should return 405 method not allowed", async () => {
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: "POST",
    });

    expect(response.status).toBe(405);
  });
});

describe("Namespace API", () => {
  it("GET /api/v1/namespace should return namespaces list", async () => {
    const response = await fetch(`${BASE_URL}/api/v1/namespace`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    expect(response.status).toBe(200);

    const json = (await response.json()) as { success: boolean; data: unknown[] };

    expect(json).toHaveProperty("success", true);
    expect(json).toHaveProperty("data");
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("GET /api/v1/namespace should return 401 without API key", async () => {
    const response = await fetch(`${BASE_URL}/api/v1/namespace`);

    expect(response.status).toBe(401);
  });

  it("GET /api/v1/namespace should return 401 with invalid API key", async () => {
    const response = await fetch(`${BASE_URL}/api/v1/namespace`, {
      headers: {
        Authorization: "Bearer invalid_api_key_12345",
      },
    });

    expect(response.status).toBe(401);

    const json = (await response.json()) as { success: boolean; error: { message: string } };
    expect(json.success).toBe(false);
    expect(json).toHaveProperty("error");
  });

  it("GET /api/v1/namespace should return 400 with malformed Authorization header", async () => {
    const response = await fetch(`${BASE_URL}/api/v1/namespace`, {
      headers: {
        Authorization: "InvalidFormat",
      },
    });

    // API returns 400 Bad Request for malformed auth header (not proper "Bearer <token>" format)
    expect(response.status).toBe(400);
  });
});

describe("Ingest Jobs API", () => {
  let createdJobId: string;

  it("POST /api/v1/namespace/{namespaceId}/ingest-jobs should create an ingest job", async () => {
    const response = await fetch(
      `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
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

    const json = (await response.json()) as {
      success: boolean;
      data: {
        id: string;
        name: string;
        namespaceId: string;
        status: string;
        payload: { type: string };
      };
    };

    expect(json).toHaveProperty("success", true);
    expect(json).toHaveProperty("data");
    expect(json.data).toHaveProperty("id");
    expect(json.data).toHaveProperty("name", "E2E Test Document");
    expect(json.data).toHaveProperty("namespaceId", NAMESPACE_ID);
    expect(json.data).toHaveProperty("status", "QUEUED");
    expect(json.data).toHaveProperty("payload");
    expect(json.data.payload).toHaveProperty("type", "TEXT");

    // Save job ID for the next test
    createdJobId = json.data.id;
  });

  it("GET /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId} should return job status", async () => {
    // Skip if no job was created
    if (!createdJobId) {
      throw new Error("No job ID available - previous test may have failed");
    }

    const response = await fetch(
      `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs/${createdJobId}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      success: boolean;
      data: { id: string; status: string };
    };

    expect(json).toHaveProperty("success", true);
    expect(json).toHaveProperty("data");
    expect(json.data).toHaveProperty("id", createdJobId);
    expect(json.data).toHaveProperty("status");
    // Status could be QUEUED, PRE_PROCESSING, PROCESSING, COMPLETED, or FAILED
    expect(["QUEUED", "PRE_PROCESSING", "PROCESSING", "COMPLETED", "FAILED"]).toContain(
      json.data.status
    );
  });

  // Negative test cases

  it("POST /api/v1/namespace/{namespaceId}/ingest-jobs should return 401 without auth", async () => {
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

  it("POST /api/v1/namespace/{namespaceId}/ingest-jobs should return 400/422 with missing payload", async () => {
    const response = await fetch(
      `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Document Without Payload",
        }),
      }
    );

    expect([400, 422]).toContain(response.status);

    const json = (await response.json()) as { success: boolean; error: unknown };
    expect(json.success).toBe(false);
    expect(json).toHaveProperty("error");
  });

  it("POST /api/v1/namespace/{namespaceId}/ingest-jobs should return 400/422 with invalid payload type", async () => {
    const response = await fetch(
      `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
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

    const json = (await response.json()) as { success: boolean; error: unknown };
    expect(json.success).toBe(false);
  });

  it("POST /api/v1/namespace/{namespaceId}/ingest-jobs should return 400/422 with empty body", async () => {
    const response = await fetch(
      `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    expect([400, 422]).toContain(response.status);

    const json = (await response.json()) as { success: boolean; error: unknown };
    expect(json.success).toBe(false);
  });

  it("GET /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId} should return 401 without auth", async () => {
    const response = await fetch(
      `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs/ij_somejobid123456789012`
    );

    expect(response.status).toBe(401);
  });

  it("GET /api/v1/namespace/{namespaceId}/ingest-jobs/{jobId} should return 404 for non-existent job", async () => {
    const response = await fetch(
      `${BASE_URL}/api/v1/namespace/${NAMESPACE_ID}/ingest-jobs/ij_nonexistent12345678901`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    expect(response.status).toBe(404);

    const json = (await response.json()) as { success: boolean; error: { message: string } };
    expect(json.success).toBe(false);
  });
});
