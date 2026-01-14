import type { UseFormReturn } from "react-hook-form";
import ListInput from "@/components/list-input";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@agentset/ui/form";
import { Separator } from "@agentset/ui/separator";
import { Switch } from "@agentset/ui/switch";

import type { HostingFormValues } from "../../use-hosting-form";

interface SecurityTabProps {
  form: UseFormReturn<HostingFormValues>;
}

export function SecurityTab({ form }: SecurityTabProps) {
  const isProtected = form.watch("protected");

  return (
    <div className="space-y-10">
      <section>
        <div>
          <h2 className="text-lg font-medium">Access Protection</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Control who can access your hosted AI assistant
          </p>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="protected"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Enable Access Protection
                  </FormLabel>
                  <FormDescription>
                    Require authentication to access your AI assistant
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

          {isProtected && (
            <div className="flex flex-col gap-6 rounded-lg border p-4">
              <div className="mb-2">
                <h3 className="font-medium">Access Rules</h3>
                <p className="text-muted-foreground text-sm">
                  Specify who can access your protected deployment
                </p>
              </div>

              <ListInput
                form={form}
                name="allowedEmails"
                label="Allowed Emails"
                description="Specific email addresses that are allowed access"
                placeholder="Enter an email address..."
              />

              <ListInput
                form={form}
                name="allowedEmailDomains"
                label="Allowed Email Domains"
                description="Allow all users from these email domains"
                placeholder="Enter a domain (e.g. example.com)..."
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
