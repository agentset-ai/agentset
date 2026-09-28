import { getCalApi } from "@calcom/embed-react";

import { REGION_FEATURES } from "@agentset/utils";

export const CAL_DEMO_LINK = "agentset/demo";
export const CAL_DEMO_URL = `https://cal.com/${CAL_DEMO_LINK}`;

let calPromise: ReturnType<typeof getCalApi> | undefined;
export const getCal = async () => {
  // the embed loads Cal.com's script into the page; without it we link out
  if (!REGION_FEATURES.calEmbed) return;

  if (!calPromise) {
    calPromise = getCalApi({ namespace: "demo" }).then((cal) => {
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
      return cal;
    });
  }

  return calPromise;
};
