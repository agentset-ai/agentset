import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
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
import { configSchema } from "@agentset/validation";

import IngestConfig from "./config";

const schema = z
  .object({
    name: z.string().optional(),
    urls: z
      .array(z.string().url("Please enter a valid YouTube URL"))
      .min(1, "At least one URL is required"),
    transcriptLanguages: z.array(z.string()).optional(),
  })
  .extend(configSchema.shape);

export default function YoutubeForm({ onSuccess }: { onSuccess: () => void }) {
  const namespace = useNamespace();
  const trpc = useTRPC();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      urls: [""],
      transcriptLanguages: [""],
    },
  });

  const { mutateAsync, isPending } = useMutation(
    trpc.ingestJob.ingest.mutationOptions({
      onSuccess: (doc) => {
        logEvent("document_ingested", {
          type: "youtube",
          namespaceId: namespace.id,
          chunkSize: doc.config?.chunkSize,
          languageCode: doc.config?.languageCode,
          forceOcr: doc.config?.forceOcr,
          mode: doc.config?.mode,
          disableImageExtraction: doc.config?.disableImageExtraction,
          disableOcrMath: doc.config?.disableOcrMath,
          useLlm: doc.config?.useLlm,
          hasMetadata: !!doc.config?.metadata,
        });
        onSuccess();
      },
    }),
  );

  const handleYoutubeSubmit = async (data: z.infer<typeof schema>) => {
    const urls = data.urls.filter(Boolean);
    const transcriptLanguages = data.transcriptLanguages?.filter(Boolean);

    const options = {
      ...(transcriptLanguages &&
        transcriptLanguages.length > 0 && { transcriptLanguages }),
    };

    const config = {
      chunkSize: data.chunkSize,
      languageCode: data.languageCode,
      forceOcr: data.forceOcr,
      mode: data.mode,
      disableImageExtraction: data.disableImageExtraction,
      disableOcrMath: data.disableOcrMath,
      useLlm: data.useLlm,
      metadata: data.metadata,
    };

    await mutateAsync({
      namespaceId: namespace.id,
      name: data.name,
      payload: {
        type: "YOUTUBE",
        urls,
        ...(Object.keys(options).length > 0 && { options }),
      },
      config: Object.keys(config).length > 0 ? config : undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleYoutubeSubmit)}>
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
            {form.watch("urls")?.map((_, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name={`urls.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://www.youtube.com/watch?v=..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {(form.watch("urls")?.length ?? 0) > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const urls = form.getValues("urls") ?? [];
                      if (urls.length <= 1) return;
                      form.setValue(
                        "urls",
                        urls.filter((_, i) => i !== index),
                      );
                    }}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="mt-1 w-fit"
              onClick={() => {
                const urls = form.getValues("urls") ?? [];
                form.setValue("urls", [...urls, ""]);
              }}
            >
              Add URL
            </Button>
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
                  {form.watch("transcriptLanguages")?.map((_, index) => (
                    <div key={index} className="flex items-end gap-2">
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`transcriptLanguages.${index}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="en" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {(form.watch("transcriptLanguages")?.length ?? 0) > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const langs =
                              form.getValues("transcriptLanguages") ?? [];
                            if (langs.length <= 1) return;
                            form.setValue(
                              "transcriptLanguages",
                              langs.filter((_, i) => i !== index),
                            );
                          }}
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-1 w-fit"
                    onClick={() => {
                      const langs =
                        form.getValues("transcriptLanguages") ?? [];
                      form.setValue("transcriptLanguages", [...langs, ""]);
                    }}
                  >
                    Add language
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <IngestConfig form={form} minimal />
        </div>

        <DialogFooter>
          <Button type="submit" isLoading={isPending}>
            Start Import
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

