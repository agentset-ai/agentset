import { useNamespace } from "@/hooks/use-namespace";
import { useZodForm } from "@/hooks/use-zod-form";
import { logEvent } from "@/lib/analytics";
import { useORPC } from "@/orpc/react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod/v4";

import { Button } from "@agentset/ui/button";
import { DialogFooter } from "@agentset/ui/dialog";
import {
  Form,
  FormControl,
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
import { extractConfig } from "./shared";

const schema = z
  .object({
    name: z.string().optional(),
    text: z.string().min(10, "Text must be at least 10 characters"),
  })
  .extend(configSchema.shape);

export default function TextForm({ onSuccess }: BaseIngestFormProps) {
  const namespace = useNamespace();
  const orpc = useORPC();

  const form = useZodForm(schema, {
    defaultValues: {},
  });

  const { mutateAsync, isPending } = useMutation(
    orpc.ingestJob.ingest.mutationOptions({
      onSuccess: (doc) => {
        logEvent("document_ingested", {
          type: "text",
          namespaceId: namespace.id,
          chunkSize: doc.config?.chunkSize,
          maxChunkSize: doc.config?.maxChunkSize,
          chunkOverlap: doc.config?.chunkOverlap,
          strategy: doc.config?.strategy,
          chunkingStrategy: doc.config?.chunkingStrategy,
          hasMetadata: !!doc.config?.metadata,
        });
        onSuccess();
      },
    }),
  );

  const onSubmit = async (data: z.infer<typeof schema>) => {
    await mutateAsync({
      namespaceId: namespace.id,
      name: data.name,
      payload: {
        type: "TEXT",
        fileName: data.name,
        text: data.text,
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
                <FormLabel>File Name</FormLabel>
                <FormControl>
                  <Input placeholder="example.txt" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Text</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter your text here"
                    className="max-h-[400px] min-h-[200px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
