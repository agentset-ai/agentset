import { queue } from "@trigger.dev/sdk";

export const enterpriseIngestionQueue = queue({
  name: "enterprise",
  concurrencyLimit: 40,
});

export const regularIngestionQueue = queue({
  name: "regular",
  concurrencyLimit: 50,
});
