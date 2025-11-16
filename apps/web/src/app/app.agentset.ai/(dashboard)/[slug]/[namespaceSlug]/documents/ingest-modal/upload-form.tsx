import { useEffect } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { useUploadFiles } from "@/hooks/use-upload";
import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import { MAX_UPLOAD_SIZE } from "@agentset/storage/constants";
import { Button } from "@agentset/ui/button";
import { DialogFooter } from "@agentset/ui/dialog";
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
import { configSchema } from "@agentset/validation";

import IngestConfig from "./config";

const schema = z
  .object({
    name: z.string().optional(),
    files: z
      .array(z.instanceof(File))
      .min(1, { message: "File is required" })
      .max(100, { message: "Maximum 100 files" }),
  })
  .extend(configSchema.shape);

export default function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const namespace = useNamespace();
  const trpc = useTRPC();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      files: [],
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

  const files = form.watch("files");
  const { setValue } = form;
  useEffect(() => {
    // if it's a single file, set the name to the file name
    if (files.length === 1 && files[0]?.name) {
      setValue("name", files[0].name);
    }
  }, [files, setValue]);

  const { onUpload, progresses, isUploading } = useUploadFiles({
    namespaceId: namespace.id,
  });

  const { mutateAsync, isPending: isFilePending } = useMutation(
    trpc.ingestJob.ingest.mutationOptions({
      onSuccess: (doc) => {
        logEvent("document_ingested", {
          type: "files",
          namespaceId: namespace.id,
          fileCount: form.getValues("files").length,
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

  const handleFileSubmit = async (data: z.infer<typeof schema>) => {
    const uploadedFiles = await onUpload(data.files);
    if (uploadedFiles.length === 0) return;

    await mutateAsync({
      namespaceId: namespace.id,
      name: data.name,
      payload: {
        type: "BATCH",
        items: uploadedFiles.map((file) => ({
          type: "MANAGED_FILE",
          key: file.key,
          fileName: file.name,
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

  const isPending = isFilePending || isUploading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFileSubmit)}>
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

          <FormField
            control={form.control}
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
                    accept={{}}
                    disabled={isPending}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <IngestConfig form={form} />
        </div>

        <DialogFooter>
          <Button type="submit" isLoading={isPending}>
            Ingest Files
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
