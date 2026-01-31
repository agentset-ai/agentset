/**
 * Health Endpoint E2E Tests
 */

import { describe, it, expect } from "vitest";
import { BASE_URL } from "./setup";

describe("Health Endpoint", () => {
  it("GET /api/health should return healthy status", async () => {
    const response = await fetch(`${BASE_URL}/api/health`);

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      status: string;
      timing: { total: number };
      timestamp: string;
    };

    expect(data).toHaveProperty("status", "healthy");
    expect(data).toHaveProperty("timing");
    expect(data.timing).toHaveProperty("total");
    expect(data).toHaveProperty("timestamp");
  });
});
