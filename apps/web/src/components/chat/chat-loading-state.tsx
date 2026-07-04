import { useEffect, useState } from "react";

import { Shimmer } from "@agentset/ui/ai/shimmer";
import { Logo } from "@agentset/ui/logo";

// Milliseconds to wait after submission before showing the placeholder, so it
// doesn't flash when the first stream part arrives quickly.
const SHOW_DELAY_MS = 350;

export function ChatLoadingState() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  if (!visible) return null;

  return (
    <div className="animate-in fade-in mx-auto w-full max-w-3xl px-4 duration-200">
      <div className="flex w-full flex-col gap-2">
        <div className="ring-border bg-background flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
          <div className="translate-y-px">
            <Logo className="size-3.5" />
          </div>
        </div>

        <Shimmer className="text-sm" duration={0.85}>
          Thinking...
        </Shimmer>
      </div>
    </div>
  );
}
