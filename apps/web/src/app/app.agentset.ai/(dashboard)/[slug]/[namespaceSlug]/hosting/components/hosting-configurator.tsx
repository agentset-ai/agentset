import { APP_DOMAIN, HOSTING_PREFIX } from "@/lib/constants";

import { Form } from "@agentset/ui/form";

import { HostingData, useHostingForm } from "../use-hosting-form";
import { HostingLayout } from "./hosting-layout";
import { HostingPreview, MobilePreviewButton } from "./hosting-preview";
import { HostingTabs } from "./hosting-tabs";
import { StickyActionBar } from "./sticky-action-bar";

export function HostingConfigurator({ data }: { data: HostingData }) {
  const { form, handleSubmit, isUpdating, isDirty, reset } =
    useHostingForm(data);

  const url = `${APP_DOMAIN}${HOSTING_PREFIX}${data.slug}`;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit}>
        <HostingLayout
          actionBar={
            <StickyActionBar
              url={url}
              isDirty={isDirty}
              isUpdating={isUpdating}
              onDiscard={reset}
            />
          }
          configPane={<HostingTabs form={form} data={data} />}
          previewPane={<HostingPreview form={form} />}
          mobilePreview={<MobilePreviewButton form={form} />}
        />
      </form>
    </Form>
  );
}
