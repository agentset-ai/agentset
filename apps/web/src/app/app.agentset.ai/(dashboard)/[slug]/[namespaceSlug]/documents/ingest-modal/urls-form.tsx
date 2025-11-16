import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

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
      .array(z.string().url("Please enter a valid URL"))
      .min(1, "Add at least one URL"),
  })
  .extend(configSchema.shape);

export default function UrlsForm({ onSuccess }: { onSuccess: () => void }) {
  const namespace = useNamespace();
  const trpc = useTRPC();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      urls: [""],
      chunkSize: 2048,
      chunkOverlap: 128,
      languageCode: "en",
      forceOcr: false,
      mode: "balanced",
      disableImageExtraction: false,
      disableOcrMath: false,
      useLlm: true,
    },
  });

  const { mutateAsync, isPending } = useMutation(
    trpc.ingestJob.ingest.mutationOptions({
      onSuccess: (doc) => {
        logEvent("document_ingested", {
          type: "urls",
          namespaceId: namespace.id,
          urlCount: form.getValues("urls").length,
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

  const handleUrlsSubmit = async (data: z.infer<typeof schema>) => {
    await mutateAsync({
      namespaceId: namespace.id,
      name: data.name,
      payload: {
        type: "BATCH",
        items: data.urls.map((url) => ({
          type: "FILE",
          fileUrl: url,
        })),
      },
      config: {
        chunkSize: data.chunkSize,
        chunkOverlap: data.chunkOverlap,
        languageCode: data.languageCode,
        forceOcr: data.forceOcr,
        mode: data.mode,
        disableImageExtraction: data.disableImageExtraction,
        disableOcrMath: data.disableOcrMath,
        useLlm: data.useLlm,
        metadata: data.metadata,
      },
    });
  };

  const addUrlField = () => {
    const urls = form.getValues("urls");
    form.setValue("urls", [...urls, ""]);
  };

  const removeUrlField = (index: number) => {
    const urls = form.getValues("urls");
    if (urls.length > 1) {
      form.setValue(
        "urls",
        urls.filter((_, i) => i !== index),
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleUrlsSubmit)}>
        <div className="flex flex-col gap-6 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="2025 Reports" {...field} />
                </FormControl>

                <FormDescription>A name for this batch</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-1">
            {form.watch("urls").map((_, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name={`urls.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{index === 0 ? "URLs" : ""}</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("urls").length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUrlField(index)}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              className="mt-4 w-fit"
              onClick={addUrlField}
            >
              Add URL
            </Button>
          </div>

          <IngestConfig form={form} />
        </div>

        <DialogFooter>
          <Button type="submit" isLoading={isPending}>
            Ingest URLs
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
