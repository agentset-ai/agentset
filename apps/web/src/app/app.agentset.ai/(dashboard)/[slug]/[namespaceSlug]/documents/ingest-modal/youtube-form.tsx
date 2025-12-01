import { useZodForm } from "@/hooks/use-zod-form";
import { z } from "zod/v4";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@agentset/ui/accordion";
import { Button } from "@agentset/ui/button";
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
import { Switch } from "@agentset/ui/switch";
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
    defaultValues: { urls: [""], transcriptLanguages: ["en"] },
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
                <FormDescription>A name for this batch</FormDescription>
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
              addButtonText="Add URL"
              inputType="url"
            />
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="youtube-options">
              <AccordionTrigger className="hover:bg-muted/70 items-center justify-start rounded-none px-2 duration-75 hover:no-underline">
                YouTube options
              </AccordionTrigger>

              <AccordionContent className="mt-6 flex flex-col gap-6 px-2">
                <div className="flex flex-col gap-1">
                  <FormLabel>Transcript languages (optional)</FormLabel>
                  <FormDescription className="mb-2">
                    Preferred languages for transcripts (e.g., en, es, fr)
                  </FormDescription>
                  <DynamicArrayField
                    form={form}
                    name="transcriptLanguages"
                    placeholder="en"
                    addButtonText="Add language"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <FormField
                    control={form.control}
                    name="includeMetadata"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Include metadata</FormLabel>
                        <FormDescription className="mb-2">
                          Whether to include metadata in the ingestion (like
                          video description, tags, category, duration, etc...).
                          Defaults to `false`.
                        </FormDescription>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <IngestConfig form={form} minimal />
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
