import { NextResponse } from "next/server";
import { createOpenApiDocument } from "@/lib/openapi";

export const dynamic = "force-static";

export const GET = async () => {
  const openapiDocument = await createOpenApiDocument();
  return NextResponse.json(openapiDocument);
};
