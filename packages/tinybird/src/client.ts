import { Tinybird } from "@chronark/zod-bird";

import { REGION_FEATURES } from "@agentset/utils";

export const isTinybirdEnabled =
  REGION_FEATURES.webhookDeliveryLogs && !!process.env.TINYBIRD_API_KEY;

export const tb = new Tinybird({
  token: process.env.TINYBIRD_API_KEY as string,
  baseUrl: process.env.TINYBIRD_API_URL as string,
});
