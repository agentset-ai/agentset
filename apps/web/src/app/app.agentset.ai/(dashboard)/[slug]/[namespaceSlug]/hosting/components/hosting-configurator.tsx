"use client";

import { useState } from "react";
import { APP_DOMAIN, HOSTING_PREFIX } from "@/lib/constants";

import { Form } from "@agentset/ui/form";

import { HostingData, useHostingForm } from "../use-hosting-form";
import { DeploymentStatusBar } from "./deployment-status-bar";
import { HostingLayout } from "./hosting-layout";
import { HostingPreview, MobilePreviewButton } from "./hosting-preview";
import { HostingTabs, TabValue } from "./hosting-tabs";
import { PreviewActionButtons } from "./preview-action-buttons";
import { SocialShareCard } from "./social-share-card";

export function HostingConfigurator({ data }: { data: HostingData }) {
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
      <form onSubmit={handleSubmit}>
        <HostingLayout
          statusBar={<DeploymentStatusBar url={url} />}
          configPane={
            <HostingTabs form={form} data={data} onTabChange={setActiveTab} />
          }
          actionButtons={
            <PreviewActionButtons
              url={url}
              isDirty={isDirty}
              isUpdating={isUpdating}
              onDiscard={reset}
            />
          }
          previewPane={renderPreviewPane()}
          mobilePreview={<MobilePreviewButton form={form} />}
        />
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
