import type { ReactNode } from "react";

import { ScrollArea } from "@agentset/ui/scroll-area";

interface HostingLayoutProps {
  statusBar: ReactNode;
  configPane: ReactNode;
  actionButtons: ReactNode;
  previewPane: ReactNode;
  mobilePreview: ReactNode;
}

export function HostingLayout({
  statusBar,
  configPane,
  actionButtons,
  previewPane,
  mobilePreview,
}: HostingLayoutProps) {
  return (
    <div className="flex h-[calc(100dvh-theme(spacing.16)-theme(spacing.20))] flex-col">
      {statusBar}
      <div className="flex flex-1 gap-8 overflow-hidden pt-6">
        {/* Config Pane - 60% on desktop, full width on mobile */}
        <ScrollArea className="flex-1 lg:flex-[6]">
          <div className="pr-4">{configPane}</div>
        </ScrollArea>

        {/* Preview Pane - 40% on desktop, hidden on mobile */}
        <div className="hidden flex-[4] lg:block">
          <div className="flex h-full flex-col gap-4">
            {/* Action Buttons */}
            {actionButtons}
            {/* Preview */}
            <div className="flex-1 overflow-hidden">{previewPane}</div>
          </div>
        </div>
      </div>

      {/* Mobile Preview Button/Drawer */}
      {mobilePreview}
    </div>
  );
}
