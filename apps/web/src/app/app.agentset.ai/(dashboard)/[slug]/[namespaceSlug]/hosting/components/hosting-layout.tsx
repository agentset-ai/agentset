import type { ReactNode } from "react";

import { ScrollArea } from "@agentset/ui/scroll-area";

interface HostingLayoutProps {
  actionBar: ReactNode;
  configPane: ReactNode;
  previewPane: ReactNode;
  mobilePreview: ReactNode;
}

export function HostingLayout({
  actionBar,
  configPane,
  previewPane,
  mobilePreview,
}: HostingLayoutProps) {
  return (
    <div className="flex h-[calc(100dvh-(--spacing(16))-(--spacing(20)))] flex-col">
      {actionBar}
      <div className="flex flex-1 gap-8 overflow-hidden pt-6">
        <ScrollArea className="flex-1 lg:flex-6">
          <div className="pr-4">{configPane}</div>
        </ScrollArea>

        <div className="hidden flex-4 lg:block">
          <div className="sticky top-0 h-full">{previewPane}</div>
        </div>
      </div>

      {mobilePreview}
    </div>
  );
}
