import { APP_DOMAIN, HOSTING_PREFIX } from "@/lib/constants";

import { Form } from "@agentset/ui/form";

import { HostingData, useHostingForm } from "../use-hosting-form";
import { DeploymentStatusBar } from "./deployment-status-bar";
import { HostingLayout } from "./hosting-layout";
import { HostingPreview, MobilePreviewButton } from "./hosting-preview";
import { HostingTabs } from "./hosting-tabs";
import { PreviewActionButtons } from "./preview-action-buttons";

export function HostingConfigurator({ data }: { data: HostingData }) {
  const { form, handleSubmit, isUpdating, isDirty, reset } =
    useHostingForm(data);

  const url = `${APP_DOMAIN}${HOSTING_PREFIX}${data.slug}`;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit}>
        <HostingLayout
          statusBar={<DeploymentStatusBar url={url} />}
          configPane={<HostingTabs form={form} data={data} />}
          actionButtons={
            <PreviewActionButtons
              url={url}
              isDirty={isDirty}
              isUpdating={isUpdating}
              onDiscard={reset}
            />
          }
          previewPane={<HostingPreview form={form} />}
          mobilePreview={<MobilePreviewButton form={form} />}
        />
      </form>
    </Form>
  );
}
