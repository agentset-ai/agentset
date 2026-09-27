import { useEffect } from "react";
import { CAL_DEMO_LINK, CAL_DEMO_URL, getCal } from "@/lib/cal";

import { REGION_FEATURES } from "@agentset/utils";

const openCalLink = () => {
  window.open(CAL_DEMO_URL, "_blank", "noopener,noreferrer");
};

export function useCal() {
  useEffect(() => {
    void getCal();
  }, []);

  if (!REGION_FEATURES.calEmbed) {
    return { buttonProps: { onClick: openCalLink } };
  }

  return {
    buttonProps: {
      "data-cal-namespace": "demo",
      "data-cal-link": CAL_DEMO_LINK,
      "data-cal-config": '{"layout":"month_view"}',
    },
  };
}
