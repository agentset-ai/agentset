import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { ImageUploader } from "@agentset/ui/image-uploader";
import { Input } from "@agentset/ui/input";
import { Separator } from "@agentset/ui/separator";
import { Textarea } from "@agentset/ui/textarea";

import type { HostingData, HostingFormValues } from "../../use-hosting-form";

interface OpenGraphTabProps {
  form: UseFormReturn<HostingFormValues>;
  data: HostingData;
}

export function OpenGraphTab({ form, data }: OpenGraphTabProps) {
  return (
    <div className="space-y-10">
      <section>
        <div>
          <h2 className="text-lg font-medium">Social Media / Open Graph</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Customize how your hosting appears when shared on social media
          </p>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="ogTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OG Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter a title for social media sharing..."
                    maxLength={70}
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length || 0}/70 characters
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ogDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OG Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter a description for social media sharing..."
                    maxLength={200}
                    className="h-24 max-h-32"
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length || 0}/200 characters
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ogImage"
            render={({ field }) => (
              <FormItem className="max-w-sm">
                <FormLabel>OG Image</FormLabel>
                <ImageUploader
                  onImageChange={field.onChange}
                  defaultImageUrl={data?.ogImage}
                  description="Upload a logo or banner image"
                />
                <FormDescription>
                  Recommended: 1200x630px. This image appears when shared on
                  social media.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>
    </div>
  );
}
