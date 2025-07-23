import { env } from "@/env";
import { Client as QstashClient, Receiver } from "@upstash/qstash";

export const qstashClient = new QstashClient({
  baseUrl: env.QSTASH_URL,
  token: env.QSTASH_TOKEN,
});

export const qstashReceiver = new Receiver({
  currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
});
