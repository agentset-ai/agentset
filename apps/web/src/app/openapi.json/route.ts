import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/server/orpc/spec";

export const dynamic = "force-static";

export const GET = async () => {
  const openapiDocument = await buildOpenApiDocument();
  return NextResponse.json(openapiDocument);
};
