import type { NextRequest } from "next/server";
import { logRequestError } from "@/lib/log";

import { AgentsetApiError } from "./errors";

export const getSearchParams = (req: NextRequest) => {
  // Create a params object
  const params = {} as Record<string, string>;

  new URL(req.url).searchParams.forEach(function (val, key) {
    params[key] = val;
  });

  return params;
};

export const parseRequestBody = async (req: NextRequest) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await req.json();
  } catch (e) {
    logRequestError("Invalid JSON request body", e);
    throw new AgentsetApiError({
      code: "bad_request",
      message:
        "Invalid JSON format in request body. Please ensure the request body is a valid JSON object.",
    });
  }
};
