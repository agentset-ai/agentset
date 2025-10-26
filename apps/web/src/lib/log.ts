import { env } from "@/env";

const logTypeToEnv = {
  alerts: env.DISCORD_HOOK_ALERTS,
  cron: env.DISCORD_HOOK_CRON,
  subscribers: env.DISCORD_HOOK_SUBSCRIBERS,
  errors: env.DISCORD_HOOK_ERRORS,
};

export const log = async ({
  message,
  type,
}: {
  message: string;
  type: "alerts" | "cron" | "subscribers" | "errors";
}) => {
  const HOOK = logTypeToEnv[type];

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
