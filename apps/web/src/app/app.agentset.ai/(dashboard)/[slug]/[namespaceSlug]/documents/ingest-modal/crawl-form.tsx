import type React from "react";
import { useState } from "react";
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
import { Textarea } from "@agentset/ui/textarea";
import { configSchema } from "@agentset/validation";

import IngestConfig from "./config";

const schema = z
  .object({
    name: z.string().optional(),
    url: z.string().url("Please enter a valid URL"),
    maxDepth: z
      .preprocess(
        (value) => (value === "" || value == null ? undefined : value),
        z.coerce.number().int().positive().optional(),
      )
      .optional(),
    limit: z
      .preprocess(
        (value) => (value === "" || value == null ? undefined : value),
        z.coerce.number().int().positive().optional(),
      )
      .optional(),
    includePaths: z.array(z.string()).optional(),
    excludePaths: z.array(z.string()).optional(),
    headers: z.record(z.string(), z.string()).optional(),
  })
  .extend(configSchema.shape);

export default function CrawlForm({ onSuccess }: { onSuccess: () => void }) {
  const namespace = useNamespace();
  const trpc = useTRPC();
  const [headersJson, setHeadersJson] = useState<string>("");

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      url: "",
      includePaths: [""],
      excludePaths: [""],
      // config fields intentionally left undefined so we rely on
      // partition API defaults; defaults are shown as placeholders
    },
  });

  const { mutateAsync, isPending } = useMutation(
    trpc.ingestJob.ingest.mutationOptions({
      onSuccess: (doc) => {
        logEvent("document_ingested", {
          type: "crawl",
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

  const handleCrawlSubmit = async (data: z.infer<typeof schema>) => {
    const options = {
      maxDepth: data.maxDepth,
      limit: data.limit,
      ...(data.includePaths &&
        data.includePaths.filter(Boolean).length > 0 && {
          includePaths: data.includePaths.filter(Boolean),
        }),
      ...(data.excludePaths &&
        data.excludePaths.filter(Boolean).length > 0 && {
          excludePaths: data.excludePaths.filter(Boolean),
        }),
      ...(data.headers &&
        Object.keys(data.headers).length > 0 && {
          headers: data.headers,
        }),
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
        type: "CRAWL",
        url: data.url,
        ...(Object.keys(options).length > 0 && { options }),
      },
      config: Object.keys(config).length > 0 ? config : undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleCrawlSubmit)}>
        <div className="flex flex-col gap-6 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Marketing site crawl" {...field} />
                </FormControl>

                <FormDescription>A name for this batch</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starting URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  We&#39;ll crawl this URL and follow links on the same site.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Accordion type="single" collapsible>
            <AccordionItem value="crawl-options">
              <AccordionTrigger className="hover:bg-muted/70 items-center justify-start rounded-none px-2 duration-75 hover:no-underline">
                Crawl options
              </AccordionTrigger>

              <AccordionContent className="mt-6 flex flex-col gap-6 px-2">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="maxDepth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max depth (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="3"
                            value={field.value?.toString() ?? ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>
                          Depth 1 crawls only the starting page.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Page limit (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="50"
                            value={field.value?.toString() ?? ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of pages to crawl.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <FormLabel>Include path prefixes (optional)</FormLabel>
                    {form.watch("includePaths")?.map((_, index) => (
                      <div key={index} className="flex items-end gap-2">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`includePaths.${index}`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="/docs" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {(form.watch("includePaths")?.length ?? 0) > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const paths =
                                form.getValues("includePaths") ?? [];
                              if (paths.length <= 1) return;
                              form.setValue(
                                "includePaths",
                                paths.filter((_, i) => i !== index),
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
                        const paths = form.getValues("includePaths") ?? [];
                        form.setValue("includePaths", [...paths, ""]);
                      }}
                    >
                      Add include path
                    </Button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <FormLabel>Exclude path prefixes (optional)</FormLabel>
                    {form.watch("excludePaths")?.map((_, index) => (
                      <div key={index} className="flex items-end gap-2">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`excludePaths.${index}`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="/blog" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {(form.watch("excludePaths")?.length ?? 0) > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const paths =
                                form.getValues("excludePaths") ?? [];
                              if (paths.length <= 1) return;
                              form.setValue(
                                "excludePaths",
                                paths.filter((_, i) => i !== index),
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
                        const paths = form.getValues("excludePaths") ?? [];
                        form.setValue("excludePaths", [...paths, ""]);
                      }}
                    >
                      Add exclude path
                    </Button>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="headers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request headers (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          value={headersJson}
                          onChange={(
                            e: React.ChangeEvent<HTMLTextAreaElement>,
                          ) => {
                            const value = e.target.value;
                            setHeadersJson(value);

                            if (value.trim() === "") {
                              field.onChange(undefined);
                              return;
                            }

                            try {
                              const parsed = JSON.parse(value) as Record<
                                string,
                                string
                              >;
                              field.onChange(parsed);
                            } catch {
                              field.onChange(undefined);
                            }
                          }}
                          placeholder='{"Authorization": "Bearer ..."}'
                          className="h-24"
                        />
                      </FormControl>
                      <FormDescription>
                        JSON object of headers to send with crawl requests.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <IngestConfig form={form} minimal />
        </div>

        <DialogFooter>
          <Button type="submit" isLoading={isPending}>
            Start Crawl
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
