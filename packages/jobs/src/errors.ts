import type { LogErrorContext } from "@agentset/utils";
import { PARTITION_BODY_TOO_LARGE_MESSAGE } from "@agentset/engine/errors";
import { isEuRegion, summarizeError } from "@agentset/utils";

// Errors the jobs throw with fixed messages. On EU only an exact match keeps
// its message, so update this list when changing a message it contains.
const JOB_ERROR_MESSAGES = new Set([
  "Chunk batch not found",
  "Demo templates are not available in this region",
  "Document JSON not found",
  PARTITION_BODY_TOO_LARGE_MESSAGE,
  "Document not found",
  "Ingest job not found",
  "Ingestion job not found",
  "Namespace not found",
  "Organization not found",
  "Partition Error",
  "Template not found",
  "This ingest source is not available in this region",
  "Webhook event payload not found or expired",
  "Webhook not found",
]);

const TASK_FAILED_MESSAGE =
  "Processing failed. Please try again, or contact support if it keeps happening.";

// Trigger.dev control flow errors, which carry no task data
const TRIGGER_ERROR_NAMES = new Set([
  "TriggerInternalError",
  "CompleteTaskWithOutput",
]);

const ID_KEYS = [
  "documentId",
  "ingestJobId",
  "jobId",
  "namespaceId",
  "organizationId",
  "templateId",
  "webhookId",
  "eventId",
] as const;

const getPayloadIds = (payload: unknown): LogErrorContext => {
  if (typeof payload !== "object" || payload === null) return {};

  const values = payload as Record<string, unknown>;
  return Object.fromEntries(
    ID_KEYS.filter((key) => typeof values[key] === "string").map((key) => [
      key,
      values[key] as string,
    ]),
  );
};

/**
 * The error as its type, code/status and the run's IDs. Task errors are
 * stored with the run, and SDK errors can carry request or response data.
 */
export const sanitizeTaskError = (
  error: unknown,
  context: LogErrorContext = {},
) => {
  if (error instanceof Error && TRIGGER_ERROR_NAMES.has(error.name)) {
    return error;
  }

  const { name, ...fields } = summarizeError(error);
  const details = Object.entries<unknown>({ ...fields, ...context })
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${String(value)}`);

  const message =
    error instanceof Error && JOB_ERROR_MESSAGES.has(error.message)
      ? error.message
      : `Task failed${details.length > 0 ? ` (${details.join(", ")})` : ""}`;

  // name and status fields drive Trigger.dev's retry handling
  return Object.assign(new Error(message), { name, ...fields });
};

/**
 * The failure message stored on documents and ingest jobs and sent in error
 * webhooks. On EU, errors without a fixed job message get a generic one; the
 * run's error keeps its IDs and status.
 */
export const getTaskFailureMessage = (error: unknown) => {
  const message =
    (error instanceof Error ? error.message : null) || "Unknown error";

  if (!isEuRegion || JOB_ERROR_MESSAGES.has(message)) return message;

  return TASK_FAILED_MESSAGE;
};

/** EU: rethrows the run's errors sanitized. Returns `run` itself on US. */
export const sanitizeRunErrors = <TPayload, TRest extends unknown[], TOutput>(
  run: (payload: TPayload, ...rest: TRest) => Promise<TOutput>,
): ((payload: TPayload, ...rest: TRest) => Promise<TOutput>) => {
  if (!isEuRegion) return run;

  return async (payload, ...rest) => {
    try {
      return await run(payload, ...rest);
    } catch (error) {
      throw sanitizeTaskError(error, getPayloadIds(payload));
    }
  };
};

/** EU: rethrows a lifecycle hook's errors sanitized. Returns `hook` on US. */
export const sanitizeHookErrors = <TPayload>(
  hook: (params: { payload: TPayload; error: unknown }) => Promise<void>,
): ((params: { payload: TPayload; error: unknown }) => Promise<void>) => {
  if (!isEuRegion) return hook;

  return async (params) => {
    try {
      await hook(params);
    } catch (error) {
      throw sanitizeTaskError(error, getPayloadIds(params.payload));
    }
  };
};
