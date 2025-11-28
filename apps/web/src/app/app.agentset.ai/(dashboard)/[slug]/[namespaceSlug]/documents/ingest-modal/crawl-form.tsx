import type React from "react";
import { useState } from "react";
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
import { Textarea } from "@agentset/ui/textarea";
import { configSchema } from "@agentset/validation";

import type { BaseIngestFormProps } from "./shared";
import IngestConfig from "./config";
import { DynamicArrayField, extractConfig } from "./shared";
import { useIngest } from "./use-ingest";

const DEFAULTS = {
  maxDepth: 5,
  limit: 50,
} as const;

const schema = z
  .object({
    name: z.string().optional(),
    url: z.url("Please enter a valid URL"),
    maxDepth: z.int().positive().optional(),
    limit: z.int().positive().optional(),
    includePaths: z.array(z.string()).optional(),
    excludePaths: z.array(z.string()).optional(),
    headers: z.record(z.string(), z.string()).optional(),
  })
  .extend(configSchema.shape);

export default function CrawlForm({ onSuccess }: BaseIngestFormProps) {
  const { mutateAsync, isPending, namespace } = useIngest({
    type: "CRAWL",
    onSuccess,
  });

  const [headersJson, setHeadersJson] = useState("");

  const form = useZodForm(schema, {
    defaultValues: {
      url: "",
      includePaths: [""],
      excludePaths: [""],
    },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const includePaths = data.includePaths?.filter(Boolean);
    const excludePaths = data.excludePaths?.filter(Boolean);
    const hasHeaders = data.headers && Object.keys(data.headers).length > 0;

    const options = {
      ...(data.maxDepth && { maxDepth: data.maxDepth }),
      ...(data.limit && { limit: data.limit }),
      ...(includePaths?.length && { includePaths }),
      ...(excludePaths?.length && { excludePaths }),
      ...(hasHeaders && { headers: data.headers }),
    };

    await mutateAsync({
      namespaceId: namespace.id,
      name: data.name,
      payload: {
        type: "CRAWL",
        url: data.url,
        ...(Object.keys(options).length > 0 && { options }),
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
                        <FormLabel>Max depth </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={DEFAULTS.maxDepth.toString()}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(
                                val === "" ? undefined : Number(val),
                              );
                            }}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Page limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={DEFAULTS.limit.toString()}
                            value={field.value?.toString() ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(
                                val === "" ? undefined : Number(val),
                              );
                            }}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <FormLabel>Include path prefixes</FormLabel>
                    <DynamicArrayField
                      form={form}
                      name="includePaths"
                      placeholder="/docs"
                      addButtonText="Add include path"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <FormLabel>Exclude path prefixes</FormLabel>
                    <DynamicArrayField
                      form={form}
                      name="excludePaths"
                      placeholder="/blog"
                      addButtonText="Add exclude path"
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="headers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request headers</FormLabel>
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
                              field.onChange(
                                JSON.parse(value) as Record<string, string>,
                              );
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
            Ingest
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
