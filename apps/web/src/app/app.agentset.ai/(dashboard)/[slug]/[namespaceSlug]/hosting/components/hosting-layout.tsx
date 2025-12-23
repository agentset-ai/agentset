import { useState } from "react";
import { APP_DOMAIN, HOSTING_PREFIX } from "@/lib/constants";

import { Form } from "@agentset/ui/form";
import { ScrollArea } from "@agentset/ui/scroll-area";

import { HostingData, useHostingForm } from "../use-hosting-form";
import { DeploymentStatusBar } from "./deployment-status-bar";
import { HostingPreview, MobilePreviewButton } from "./hosting-preview";
import { HostingTabs, TabValue } from "./hosting-tabs";
import { PreviewActionButtons } from "./preview-action-buttons";
import { SocialShareCard } from "./social-share-card";

export function HostingLayout({ data }: { data: HostingData }) {
  const { form, handleSubmit, isUpdating, isDirty, reset } =
    useHostingForm(data);
  const [activeTab, setActiveTab] = useState<TabValue>("branding");

  const url = `${APP_DOMAIN}${HOSTING_PREFIX}${data.slug}`;

  function renderPreviewPane() {
    switch (activeTab) {
      case "branding":
        return <HostingPreview form={form} />;
      case "opengraph":
        return <SocialSharePreview form={form} />;
      default:
        return <HostingPreview form={form} />;
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="h-full">
        <div className="flex h-[calc(100dvh-(--spacing(2))-(--spacing(20)))] flex-col">
          <DeploymentStatusBar url={url} />
          <div className="flex flex-1 gap-8 overflow-hidden pt-6">
            {/* Config Pane - 60% on desktop, full width on mobile */}
            <ScrollArea className="flex-1 lg:flex-6">
              <div className="pr-4">
                <HostingTabs
                  form={form}
                  data={data}
                  onTabChange={setActiveTab}
                />
              </div>
            </ScrollArea>

            {/* Preview Pane - 40% on desktop, hidden on mobile */}
            <div className="hidden flex-4 lg:block">
              <div className="flex h-full flex-col gap-4">
                {/* Action Buttons */}
                <PreviewActionButtons
                  url={url}
                  isDirty={isDirty}
                  isUpdating={isUpdating}
                  onDiscard={reset}
                />
                {/* Preview */}
                <div className="flex-1 overflow-hidden">
                  {renderPreviewPane()}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Preview Button/Drawer */}
          <MobilePreviewButton form={form} />
        </div>
      </form>
    </Form>
  );
}

function SocialSharePreview({
  form,
}: {
  form: ReturnType<typeof useHostingForm>["form"];
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border">
      <div className="bg-muted/30 border-b px-4 py-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Social Preview
        </span>
      </div>

      <div className="bg-background flex flex-1 items-center justify-center p-6">
        <SocialShareCard form={form} />
      </div>
    </div>
  );
}
