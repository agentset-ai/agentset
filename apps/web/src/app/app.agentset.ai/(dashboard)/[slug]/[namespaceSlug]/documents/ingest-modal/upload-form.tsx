import { useEffect } from "react";
import { useNamespace } from "@/contexts/namespace-context";
import { useUploadFiles } from "@/hooks/use-upload";
import { useTRPC } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import { MAX_UPLOAD_SIZE } from "@agentset/storage/constants";
import {
  Button,
  DialogFooter,
  FileUploader,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@agentset/ui";
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
  const { activeNamespace } = useNamespace();
  const trpc = useTRPC();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      files: [],
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
    namespaceId: activeNamespace.id,
  });

  const { mutateAsync, isPending: isFilePending } = useMutation(
    trpc.ingestJob.ingest.mutationOptions({
      onSuccess,
    }),
  );

  const handleFileSubmit = async (data: z.infer<typeof schema>) => {
    const uploadedFiles = await onUpload(data.files);
    if (uploadedFiles.length === 0) return;

    await mutateAsync({
      namespaceId: activeNamespace.id,
      name: data.name,
      payload: {
        type: "BATCH",
        items: uploadedFiles.map((file) => ({
          type: "MANAGED_FILE",
          key: file.key,
          fileName: file.name,
        })),
      },
      config:
        data.chunkSize ||
        data.maxChunkSize ||
        data.chunkOverlap ||
        data.metadata
          ? {
              chunkSize: data.chunkSize,
              maxChunkSize: data.maxChunkSize,
              chunkOverlap: data.chunkOverlap,
              metadata: data.metadata,
            }
          : undefined,
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
