import { NextResponse } from "next/server";
import { z, ZodError } from "zod/v4";

import { capitalize } from "@agentset/utils";

export const ErrorCode = z.enum([
  "bad_request",
  "not_found",
  "internal_server_error",
  "unauthorized",
  "forbidden",
  "rate_limit_exceeded",
  "invite_expired",
  "invite_pending",
  "exceeded_limit",
  "conflict",
  "unprocessable_entity",
]);

const docsBase = "https://docs.agentset.ai";

const errorCodeToHttpStatus: Record<z.infer<typeof ErrorCode>, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  exceeded_limit: 403,
  not_found: 404,
  conflict: 409,
  invite_pending: 409,
  invite_expired: 410,
  unprocessable_entity: 422,
  rate_limit_exceeded: 429,
  internal_server_error: 500,
};

const _ErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: ErrorCode.meta({
      description: "A short code indicating the error code returned.",
      example: "not_found",
    }),
    message: z.string().meta({
      description: "A human readable error message.",
      example: "The requested resource was not found.",
    }),
    doc_url: z
      .string()
      .optional()
      .meta({
        description: "A URL to more information about the error code reported.",
        example: `${docsBase}/api-reference`,
      }),
  }),
});

export type ErrorResponse = z.infer<typeof _ErrorSchema>;

export class AgentsetApiError extends Error {
  public readonly code: z.infer<typeof ErrorCode>;
  public readonly docUrl?: string;

  constructor({
    code,
    message,
    docUrl,
  }: {
    code: z.infer<typeof ErrorCode>;
    message: string;
    docUrl?: string;
  }) {
    super(message);
    this.code = code;
    this.docUrl = docUrl ?? `${docErrorUrl}#${code.replace("_", "-")}`;
  }
}

const docErrorUrl = `${docsBase}/api-reference/errors`;

export function fromZodError(error: ZodError): Pick<ErrorResponse, "error"> {
  // Format the first error message
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return {
      error: {
        code: "unprocessable_entity",
        message: "Validation failed.",
        doc_url: `${docErrorUrl}#unprocessable-entity`,
      },
    };
  }

  // Build path string (e.g., "user.email" or "items[0].name")
  const path = firstIssue.path
    .map((key) => (typeof key === "number" ? `[${key}]` : key))
    .join(".");

  // Format message with path if available
  const message = path ? `${path}: ${firstIssue.message}` : firstIssue.message;

  return {
    error: {
      code: "unprocessable_entity",
      message,
      doc_url: `${docErrorUrl}#unprocessable-entity`,
    },
  };
}

export function handleApiError(
  error: unknown,
): Pick<ErrorResponse, "error"> & { status: number } {
  const errorMessage =
    error instanceof Error ? error.message : "An unknown error occurred";
  console.error("API error occurred", errorMessage);

  // Zod errors
  if (error instanceof ZodError) {
    return {
      ...fromZodError(error),
      status: errorCodeToHttpStatus.unprocessable_entity,
    };
  }

  // AgentsetApiError errors
  if (error instanceof AgentsetApiError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        doc_url: error.docUrl,
      },
      status: errorCodeToHttpStatus[error.code],
    };
  }

  // Prisma record not found error
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025"
  ) {
    const prismaError = error as {
      code: string;
      meta?: { cause?: string };
      message?: string;
    };
    return {
      error: {
        code: "not_found",
        message:
          prismaError.meta?.cause ||
          prismaError.message ||
          "The requested resource was not found.",
        doc_url: `${docErrorUrl}#not-found`,
      },
      status: 404,
    };
  }

  // Fallback
  // Unhandled errors are not user-facing, so we don't expose the actual error
  return {
    error: {
      code: "internal_server_error",
      message:
        "An internal server error occurred. Please contact our support if the problem persists.",
      doc_url: `${docErrorUrl}#internal-server-error`,
    },
    status: 500,
  };
}

export function handleAndReturnErrorResponse(
  err: unknown,
  headers?: Record<string, string>,
) {
  const { error, status } = handleApiError(err);
  return NextResponse.json<ErrorResponse>(
    { success: false, error },
    { headers, status },
  );
}

export const exceededLimitError = ({
  plan,
  limit,
  type,
}: {
  plan: string;
  limit: number;
  type: "retrievals" | "api" | "pages";
}) => {
  return `You've reached your ${
    type === "retrievals" ? "monthly" : ""
  } limit of ${limit} ${
    limit === 1 ? type.slice(0, -1) : type
  } on the ${capitalize(plan)} plan. Please upgrade to add more ${type}.`;
};
