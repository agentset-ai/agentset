import type { UseFormReturn } from "react-hook-form";
import { useZodForm } from "@/hooks/use-zod-form";
import { z } from "zod/v4";

import { Button } from "@agentset/ui/button";
import { Checkbox } from "@agentset/ui/checkbox";
import { DialogFooter } from "@agentset/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";
import { Label } from "@agentset/ui/label";
import { configSchema, languageCode } from "@agentset/validation";

import type { BaseIngestFormProps } from "./shared";
import IngestConfig from "./config";
import { DynamicArrayField, extractConfig } from "./shared";
import { useIngest } from "./use-ingest";

const schema = z
  .object({
    name: z.string().optional(),
    urls: z
      .array(
        z.url({
          hostname: /^(www\.youtube\.com|youtu\.be)$/,
          error: "Please enter a valid YouTube URL",
        }),
      )
      .min(1, "At least one URL is required"),
    transcriptLanguages: z.array(languageCode).optional(),
    includeMetadata: z.boolean().optional(),
  })
  .extend(configSchema.shape);

export default function YoutubeForm({ onSuccess }: BaseIngestFormProps) {
  const { mutateAsync, isPending, namespace } = useIngest({
    type: "YOUTUBE",
    onSuccess,
  });

  const form = useZodForm(schema, {
    defaultValues: { name: "", urls: [""], transcriptLanguages: ["en"] },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const urls = data.urls.filter(Boolean);
    const transcriptLanguages = data.transcriptLanguages?.filter(Boolean);
    const includeMetadata = data.includeMetadata;

    await mutateAsync({
      namespaceId: namespace.id,
      name: data.name,
      payload: {
        type: "YOUTUBE",
        urls,
        ...(((transcriptLanguages && transcriptLanguages.length > 0) ||
          includeMetadata) && {
          options: { transcriptLanguages, includeMetadata },
        }),
      },
      config: extractConfig(data),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Product tutorials" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-1">
            <FormLabel>YouTube URLs</FormLabel>
            <FormDescription className="mb-2">
              Enter video, channel, or playlist URLs
            </FormDescription>
            <DynamicArrayField
              form={form}
              name="urls"
              placeholder="https://www.youtube.com/watch?v=..."
              addButtonText="Add"
              inputType="url"
            />
          </div>

          <IngestConfig
            form={form}
            minimal
            extraSettings={<YoutubeSettings form={form} />}
          />
        </div>

        <DialogFooter>
          <Button type="submit" isLoading={isPending}>
            Ingest
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

interface YoutubeSettingsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}

function YoutubeSettings({ form }: YoutubeSettingsProps) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label>Transcript languages (optional)</Label>
        <p className="text-muted-foreground mb-2 text-sm">
          Preferred languages for transcripts (e.g., en, es, fr)
        </p>
        <DynamicArrayField
          form={form}
          name="transcriptLanguages"
          placeholder="en"
          addButtonText="Add language"
        />
      </div>

      <FormField
        control={form.control}
        name="includeMetadata"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="font-normal">Include metadata</FormLabel>
            </div>
            <FormDescription>
              Include video description, tags, category, duration, etc.
            </FormDescription>
          </FormItem>
        )}
      />
    </>
  );
}
