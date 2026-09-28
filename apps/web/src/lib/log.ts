import { env } from "@/env";

import type { LogErrorContext } from "@agentset/utils";
import { isEuRegion, logError } from "@agentset/utils";

const logTypeToEnv = {
  alerts: env.DISCORD_HOOK_ALERTS,
  cron: env.DISCORD_HOOK_CRON,
  subscribers: env.DISCORD_HOOK_SUBSCRIBERS,
  errors: env.DISCORD_HOOK_ERRORS,
};

export const log = async ({
  message: _message,
  type,
}: {
  message: string;
  type: "alerts" | "cron" | "subscribers" | "errors";
}) => {
  const HOOK = logTypeToEnv[type];
  const message = isEuRegion ? `[EU] ${_message}` : _message;

  if (env.NODE_ENV === "development" || !HOOK) {
    console.error(message);
    return;
  }

  try {
    return await fetch(HOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: `${type === "alerts" || type === "errors" ? "🚨 " : ""}${message}`,
      }),
    });
  } catch (e) {
    console.log(`Failed to log to Agentset Discord. Error: ${e}`);
  }
};

/**
 * Logs an error caught while serving a request. US logs the error itself;
 * EU logs the message with the error's type and status fields and the given
 * IDs only (see logError).
 */
export const logRequestError = (
  message: string,
  error: unknown,
  context?: LogErrorContext,
) => {
  if (isEuRegion) {
    logError(message, error, context);
    return;
  }

  console.error(error);
};
