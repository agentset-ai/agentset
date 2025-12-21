import type { UseFormReturn } from "react-hook-form";
import SortableList from "@/components/sortable-list";
import { APP_DOMAIN, HOSTING_PREFIX } from "@/lib/constants";

import { AvatarUploader } from "@agentset/ui/avatar-uploader";
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
import { SocialShareCard } from "../social-share-card";

interface GeneralTabProps {
  form: UseFormReturn<HostingFormValues>;
  data: HostingData;
}

export function GeneralTab({ form, data }: GeneralTabProps) {
  return (
    <div className="space-y-10">
      <section>
        <div>
          <h2 className="text-lg font-medium">Basic Information</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure the basic details for your hosted AI assistant
          </p>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter a title for your hosting..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter a unique slug..." />
                </FormControl>
                <FormDescription>
                  Your URL: {APP_DOMAIN}
                  {HOSTING_PREFIX}
                  {field.value}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo</FormLabel>
                <AvatarUploader
                  onImageChange={field.onChange}
                  defaultImageUrl={data?.logo}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="welcomeMessage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Welcome Message</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="h-24 max-h-32"
                    placeholder="Enter a welcome message that will be shown to users when they first interact with your AI assistant..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SortableList
            form={form}
            name="exampleQuestions"
            label="Example Questions"
            maxItems={4}
          />
        </div>
      </section>

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

          <div className="mt-2">
            <FormLabel className="mb-3 block">Preview</FormLabel>
            <SocialShareCard form={form} />
          </div>
        </div>
      </section>
    </div>
  );
}
