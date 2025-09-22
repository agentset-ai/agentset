import { useState } from "react";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const uploadWithProgress = (
  url: string,
  file: File,
  {
    onProgress,
  }: {
    onProgress: (percent: number) => void;
  },
) => {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentCompleted = Math.round((event.loaded * 100) / event.total);
        onProgress(percentCompleted);
      }
    });

    xhr.onload = () => {
      if (xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`Upload failed: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Error during upload."));
    };

    xhr.send(file);
  });
};

export function useUploadFiles({ namespaceId }: { namespaceId: string }) {
  const trpc = useTRPC();
  const { mutateAsync: getPresignedUrls } = useMutation(
    trpc.upload.getPresignedUrls.mutationOptions(),
  );

  const [uploadedFiles, setUploadedFiles] = useState<
    { key: string; name: string }[]
  >([]);

  const [progresses, setProgresses] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);

  async function onUpload(files: File[]) {
    setIsUploading(true);
    const newEntries: { name: string; key: string }[] = [];

    try {
      const presignResponses = await getPresignedUrls({
        namespaceId,
        files: files.map((file) => ({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        })),
      });

      await Promise.all(
        presignResponses.map(async (presignResponse, i) => {
          const file = files[i]!;

          await uploadWithProgress(presignResponse.url, file, {
            onProgress: (percent) => {
              setProgresses((prev) => ({ ...prev, [file.name]: percent }));
            },
          });

          const newEntry = { name: file.name, key: presignResponse.key };
          newEntries.push(newEntry);
          setUploadedFiles((prev) => [...prev, newEntry]);
        }),
      );
    } catch {
      toast.error("Failed to upload file!");
    } finally {
      setProgresses({});
      setIsUploading(false);
    }

    return newEntries;
  }

  return {
    onUpload,
    uploadedFiles,
    progresses,
    isUploading,
  };
}
