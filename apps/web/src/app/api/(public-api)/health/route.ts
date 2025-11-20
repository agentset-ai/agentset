import { NextResponse } from "next/server";

import { db } from "@agentset/db/client";

export const preferredRegion = "iad1"; // closest region to the DB

export const GET = async () => {
  const startTime = Date.now();

  try {
    await db.$executeRaw`SELECT 1;`;
    const totalTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "healthy",
        timing: {
          total: `${totalTime}ms`,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const totalTime = Date.now() - startTime;
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timing: {
          failedAfter: `${totalTime}ms`,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
};
