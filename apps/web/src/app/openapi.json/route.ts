import { NextResponse } from "next/server";
import { document } from "@/lib/openapi";

export const dynamic = "force-static";

export const GET = () => {
  return NextResponse.json(document);
};
