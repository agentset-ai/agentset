import type { UseFormReturn } from "react-hook-form";
import { useEffect } from "react";
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

const filesSchema = z
  .object({
    name: z.string().optional(),
    sourceType: z.enum(["upload", "remote"]),
    files: z
      .array(z.instanceof(File))
      .max(100, { message: "Maximum 100 files" }),
    urls: z.array(z.string()),
  })
  .extend(configSchema.shape)
  .superRefine((data, ctx) => {
    if (data.sourceType === "upload" && data.files.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one file is required",
        path: ["files"],
      });
    }
    if (data.sourceType === "remote") {
      const validUrls = data.urls.filter(Boolean);
      if (validUrls.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "At least one URL is required",
          path: ["urls"],
        });
      }
      for (let i = 0; i < data.urls.length; i++) {
        const url = data.urls[i];
        if (url && !z.url().safeParse(url).success) {
          ctx.addIssue({
            code: "custom",
            message: "Please enter a valid URL",
            path: ["urls", i],
          });
        }
      }
    }
  });

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
  const form = useZodForm(filesSchema, {
    defaultValues: {
      name: "",
      sourceType: "upload",
      files: [],
      urls: [""],
      useLlm: true,
    },
  });

  const sourceType = form.watch("sourceType");

  const {
    mutateAsync,
    isPending: isMutating,
    namespace,
  } = useIngest({
    type: "BATCH",
    onSuccess,
    extraAnalytics: () =>
      sourceType === "upload"
        ? { fileCount: form.getValues("files").length }
        : { urlCount: form.getValues("urls").filter(Boolean).length },
  });

  const { onUpload, progresses, isUploading } = useUploadFiles({
    namespaceId: namespace.id,
  });

  // Auto-set name from single file
  const files = form.watch("files");
  const { setValue } = form;
  useEffect(() => {
    if (files.length === 1 && files[0]?.name) {
      setValue("name", files[0].name);
    }
  }, [files, setValue]);

  const onSubmit = async (data: z.infer<typeof filesSchema>) => {
    if (data.sourceType === "upload") {
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
    } else {
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
    }
  };

  const isPending = isMutating || isUploading;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6 py-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name (optional)</FormLabel>
              <FormControl>
                <Input placeholder="2025 Reports" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-3">
          <FormLabel>Files</FormLabel>
          <FormField
            control={form.control}
            name="sourceType"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="upload" id="upload" />
                  <Label
                    htmlFor="upload"
                    className="cursor-pointer font-normal"
                  >
                    Upload
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="remote" id="remote" />
                  <Label
                    htmlFor="remote"
                    className="cursor-pointer font-normal"
                  >
                    Remote
                  </Label>
                </div>
              </RadioGroup>
            )}
          />

          {sourceType === "upload" ? (
            <FormField
              control={form.control}
              name="files"
              render={({ field }) => (
                <FormItem>
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
          ) : (
            <DynamicArrayField
              form={form}
              name="urls"
              placeholder="https://example.com"
              addButtonText="Add"
              inputType="url"
            />
          )}
        </div>

        <ModeField form={form} />
        <IngestConfig form={form} />

        <DialogFooter>
          <Button type="submit" isLoading={isPending}>
            Ingest
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
