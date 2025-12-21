import type { UseFormReturn } from "react-hook-form";
import SortableList from "@/components/sortable-list";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@agentset/ui/form";
import { Separator } from "@agentset/ui/separator";
import { Switch } from "@agentset/ui/switch";

import type { HostingData, HostingFormValues } from "../../use-hosting-form";
import { CustomDomainConfigurator } from "../../domain-card";

interface ConnectivityTabProps {
  form: UseFormReturn<HostingFormValues>;
  data: HostingData;
}

export function ConnectivityTab({ form, data }: ConnectivityTabProps) {
  const searchEnabled = form.watch("searchEnabled");

  return (
    <div className="space-y-10">
      <section>
        <div>
          <h2 className="text-lg font-medium">Search Settings</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Allow users to search through your documents directly
          </p>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="searchEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Search</FormLabel>
                  <FormDescription>
                    Allow users to search through your documents
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {searchEnabled && (
            <SortableList
              form={form}
              name="exampleSearchQueries"
              label="Example Search Queries"
              maxItems={4}
            />
          )}
        </div>
      </section>

      <section>
        <div>
          <h2 className="text-lg font-medium">Custom Domain</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Connect your own domain to your hosted AI assistant
          </p>
        </div>

        <Separator className="my-4" />

        <CustomDomainConfigurator defaultDomain={data.domain?.slug} />
      </section>
    </div>
  );
}
