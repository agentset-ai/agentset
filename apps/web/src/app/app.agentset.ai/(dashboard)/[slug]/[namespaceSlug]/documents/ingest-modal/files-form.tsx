import type { UseFormReturn } from "react-hook-form";
import { useEffect, useState } from "react";
import { useOrganization } from "@/hooks/use-organization";
import { useUploadFiles } from "@/hooks/use-upload";
import { useZodForm } from "@/hooks/use-zod-form";
import { SUPPORTED_TYPES } from "@/lib/file-types";
import { z } from "zod/v4";

import { MAX_UPLOAD_SIZE } from "@agentset/storage/constants";
import { isFreePlan } from "@agentset/stripe/plans";
import { Badge } from "@agentset/ui/badge";
import { Button } from "@agentset/ui/button";
import { DialogFooter } from "@agentset/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@agentset/ui/field";
import { FileUploader } from "@agentset/ui/file-uploader";
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
import { RadioGroup, RadioGroupItem } from "@agentset/ui/radio-group";
import { configSchema } from "@agentset/validation";

import type { BaseIngestFormProps } from "./shared";
import IngestConfig from "./config";
import { DynamicArrayField, extractConfig } from "./shared";
import { useIngest } from "./use-ingest";

type SourceType = "upload" | "remote";

const uploadSchema = z
  .object({
    name: z.string().optional(),
    files: z
      .array(z.instanceof(File))
      .min(1, { message: "File is required" })
      .max(100, { message: "Maximum 100 files" }),
  })
  .extend(configSchema.shape);

const remoteSchema = z
  .object({
    name: z.string().optional(),
    urls: z
      .array(z.url("Please enter a valid URL"))
      .min(1, "Add at least one URL"),
  })
  .extend(configSchema.shape);

const ACCEPT = SUPPORTED_TYPES.reduce(
  (acc, type) => {
    type.mimeTypesPrefixes?.forEach((prefix) => {
      acc[`${prefix}/*`] = [...(acc[`${prefix}/*`] ?? []), ...type.extensions];
    });
    type.mimeTypes?.forEach((mimeType) => {
      acc[mimeType] = [...(acc[mimeType] ?? []), ...type.extensions];
    });
    return acc;
  },
  {} as Record<string, string[]>,
);

const MODE_OPTIONS = [
  {
    value: "fast",
    title: "Fast",
    description: "Quick processing, good for simple documents",
  },
  {
    value: "balanced",
    title: "Balanced",
    description: "Best balance of speed and accuracy",
  },
  {
    value: "accurate",
    title: "Accurate",
    description: "Best quality, slower processing",
    proOnly: true,
  },
];

const ModeField = ({ form }: { form: UseFormReturn<any> }) => {
  const { plan } = useOrganization();
  const isFree = isFreePlan(plan);

  return (
    <FormField
      control={form.control}
      name="mode"
      render={({ field }) => (
        <FieldSet>
          <FieldLabel>Mode</FieldLabel>

          <RadioGroup
            value={field.value ?? "balanced"}
            onValueChange={field.onChange}
            className="grid grid-cols-3 gap-3"
          >
            {MODE_OPTIONS.map((option) => {
              const disabled = option.proOnly && isFree;
              return (
                <FieldLabel key={option.value} htmlFor={`mode-${option.value}`}>
                  <Field orientation="horizontal" data-disabled={disabled}>
                    <FieldContent>
                      <FieldTitle>
                        {option.title}
                        {option.proOnly && <Badge>Pro</Badge>}
                      </FieldTitle>
                      <FieldDescription>{option.description}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem
                      value={option.value}
                      id={`mode-${option.value}`}
                      disabled={disabled}
                    />
                  </Field>
                </FieldLabel>
              );
            })}
          </RadioGroup>
          <FormMessage />
        </FieldSet>
      )}
    />
  );
};

export default function FilesForm({ onSuccess }: BaseIngestFormProps) {
  const [sourceType, setSourceType] = useState<SourceType>("upload");

  const uploadForm = useZodForm(uploadSchema, {
    defaultValues: { name: "", files: [] },
  });

  const remoteForm = useZodForm(remoteSchema, {
    defaultValues: { urls: [""] },
  });

  const {
    mutateAsync,
    isPending: isMutating,
    namespace,
  } = useIngest({
    type: "BATCH",
    onSuccess,
    extraAnalytics: () =>
      sourceType === "upload"
        ? { fileCount: uploadForm.getValues("files").length }
        : { urlCount: remoteForm.getValues("urls").length },
  });

  const { onUpload, progresses, isUploading } = useUploadFiles({
    namespaceId: namespace.id,
  });

  // Auto-set name from single file
  const files = uploadForm.watch("files");
  const { setValue } = uploadForm;
  useEffect(() => {
    if (files.length === 1 && files[0]?.name) {
      setValue("name", files[0].name);
    }
  }, [files, setValue]);

  const onUploadSubmit = async (data: z.infer<typeof uploadSchema>) => {
    const uploaded = await onUpload(data.files);
    if (uploaded.length === 0) return;

    await mutateAsync({
      namespaceId: namespace.id,
      name: data.name,
      payload: {
        type: "BATCH",
        items: uploaded.map((file) => ({
          type: "MANAGED_FILE",
          key: file.key,
          fileName: file.name,
        })),
      },
      config: extractConfig(data),
    });
  };

  const onRemoteSubmit = async (data: z.infer<typeof remoteSchema>) => {
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

  const isPending = isMutating || isUploading;

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-3">
        <Label>Source</Label>
        <RadioGroup
          value={sourceType}
          onValueChange={(v) => setSourceType(v as SourceType)}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="upload" id="upload" />
            <Label htmlFor="upload" className="cursor-pointer font-normal">
              Upload files
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="remote" id="remote" />
            <Label htmlFor="remote" className="cursor-pointer font-normal">
              Remote URL
            </Label>
          </div>
        </RadioGroup>
      </div>

      {sourceType === "upload" ? (
        <Form {...uploadForm}>
          <form onSubmit={uploadForm.handleSubmit(onUploadSubmit)}>
            <div className="flex flex-col gap-6">
              <FormField
                control={uploadForm.control}
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

              <FormField
                control={uploadForm.control}
                name="files"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Files</FormLabel>
                    <FormControl>
                      <FileUploader
                        value={field.value}
                        onValueChange={field.onChange}
                        maxFileCount={100}
                        multiple
                        maxSize={MAX_UPLOAD_SIZE}
                        progresses={progresses}
                        accept={ACCEPT}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ModeField form={uploadForm} />
              <IngestConfig form={uploadForm} />
            </div>

            <DialogFooter className="mt-6">
              <Button type="submit" isLoading={isPending}>
                Ingest
              </Button>
            </DialogFooter>
          </form>
        </Form>
      ) : (
        <Form {...remoteForm}>
          <form onSubmit={remoteForm.handleSubmit(onRemoteSubmit)}>
            <div className="flex flex-col gap-6">
              <FormField
                control={remoteForm.control}
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
                form={remoteForm}
                name="urls"
                label="URLs"
                placeholder="https://example.com"
                addButtonText="Add URL"
                inputType="url"
                showLabelOnFirstOnly
              />

              <ModeField form={remoteForm} />
              <IngestConfig form={remoteForm} />
            </div>

            <DialogFooter className="mt-6">
              <Button type="submit" isLoading={isPending}>
                Ingest
              </Button>
            </DialogFooter>
          </form>
        </Form>
      )}
    </div>
  );
}
