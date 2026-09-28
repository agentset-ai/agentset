import { isEuRegion } from "@agentset/utils";

// EU: queries are sent as POST so their input stays out of request URLs
export const trpcLinkMethodOptions = isEuRegion
  ? { methodOverride: "POST" as const }
  : {};

export const trpcHandlerMethodOptions = isEuRegion
  ? { allowMethodOverride: true }
  : {};
