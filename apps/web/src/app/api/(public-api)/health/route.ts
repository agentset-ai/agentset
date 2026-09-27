import { NextResponse } from "next/server";
import { env } from "@/env";
import { log } from "@/lib/log";
import { waitUntil } from "@vercel/functions";

import { db } from "@agentset/db/client";
import { EU_VERCEL_REGIONS, isEuRegion } from "@agentset/utils";

let reportedRegionMismatch = false;

// On EU, flag functions running outside the EU Vercel regions (alerts once per instance)
const getRegionMismatch = () => {
  if (!isEuRegion) return undefined;

  const vercelRegion = env.VERCEL_REGION;
  if (
    !vercelRegion ||
    (EU_VERCEL_REGIONS as readonly string[]).includes(vercelRegion)
  ) {
    return undefined;
  }

  if (!reportedRegionMismatch) {
    reportedRegionMismatch = true;
    waitUntil(
      log({
        message: `Health check ran in Vercel region ${vercelRegion}, outside the EU regions (${EU_VERCEL_REGIONS.join(", ")})`,
        type: "alerts",
      }),
    );
  }

  return { vercelRegion, expected: EU_VERCEL_REGIONS };
};

export const GET = async () => {
  const startTime = Date.now();
  const regionMismatch = getRegionMismatch();

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
        ...(regionMismatch && { regionMismatch }),
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
        ...(regionMismatch && { regionMismatch }),
      },
      { status: 500 },
    );
  }
};
