import { useZodForm } from "@/hooks/use-zod-form";
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

import type { BaseIngestFormProps } from "./shared";
import IngestConfig from "./config";
import { DynamicArrayField, extractConfig } from "./shared";
import { useIngest } from "./use-ingest";

const schema = z
  .object({
    name: z.string().optional(),
    urls: z
      .array(z.url("Please enter a valid URL"))
      .min(1, "Add at least one URL"),
  })
  .extend(configSchema.shape);

export default function UrlsForm({ onSuccess }: BaseIngestFormProps) {
  const form = useZodForm(schema, {
    defaultValues: { urls: [""] },
  });

  const { mutateAsync, isPending, namespace } = useIngest({
    type: "BATCH",
    onSuccess,
    extraAnalytics: () => ({ urlCount: form.getValues("urls").length }),
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    await mutateAsync({
      namespaceId: namespace.id,
      name: data.name,
      payload: {
        type: "BATCH",
        items: data.urls.filter(Boolean).map((url) => ({
          type: "FILE",
          fileUrl: url,
        })),
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
                  <Input placeholder="2025 Reports" {...field} />
                </FormControl>
                <FormDescription>A name for this batch</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <DynamicArrayField
            form={form}
            name="urls"
            label="URLs"
            placeholder="https://example.com"
            addButtonText="Add URL"
            inputType="url"
            showLabelOnFirstOnly
          />

          <IngestConfig form={form} />
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
