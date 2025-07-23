import { AgentsetApiError } from "../api/errors";
import { log } from "../log";
import { qstashReceiver } from "../qstash";

export const verifyQstashSignature = async ({
  req,
  rawBody,
}: {
  req: Request;
  rawBody: string; // Make sure to pass the raw body not the parsed JSON
}) => {
  // skip verification in local development
  if (process.env.VERCEL !== "1") {
    return;
  }

  const signature = req.headers.get("Upstash-Signature");

  if (!signature) {
    throw new AgentsetApiError({
      code: "bad_request",
      message: "Upstash-Signature header not found.",
    });
  }

  const isValid = await qstashReceiver.verify({
    signature,
    body: rawBody,
  });

  if (!isValid) {
    const url = req.url;
    const messageId = req.headers.get("Upstash-Message-Id");

    void log({
      message: `Invalid QStash request signature: *${url}* - *${messageId}*`,
      type: "errors",
    });

    throw new AgentsetApiError({
      code: "unauthorized",
      message: "Invalid QStash request signature.",
    });
  }
};
