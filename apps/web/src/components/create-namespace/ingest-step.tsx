"use client";

import { useCallback, useState } from "react";
import { FileIcon, UploadCloudIcon, XIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import { DialogFooter } from "@agentset/ui/dialog";
import { formatBytes } from "@agentset/utils";

interface IngestStepProps {
  onSubmit: (files: File[]) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function IngestStep({ onSubmit, onSkip, onBack }: IngestStepProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...selectedFiles]);
      }
    },
    [],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = () => {
    // TODO: Implement actual file upload functionality
    // For now, just proceed with the files (non-functional)
    onSubmit(files);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium">Upload Files (Optional)</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Upload documents to populate your namespace. You can also do this
          later.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
        )}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
          // TODO: Add accept attribute for supported file types
        />

        <UploadCloudIcon
          className={cn(
            "mb-4 h-10 w-10 transition-colors",
            isDragOver ? "text-primary" : "text-muted-foreground",
          )}
        />

        <p className="text-sm font-medium">
          {isDragOver ? "Drop files here" : "Drag and drop files here"}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          or click to browse files
        </p>

        <div className="text-muted-foreground mt-4 flex flex-wrap justify-center gap-2 text-xs">
          <span className="bg-muted rounded px-2 py-0.5">PDF</span>
          <span className="bg-muted rounded px-2 py-0.5">TXT</span>
          <span className="bg-muted rounded px-2 py-0.5">MD</span>
          <span className="bg-muted rounded px-2 py-0.5">DOCX</span>
          <span className="bg-muted rounded px-2 py-0.5">CSV</span>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </p>
          <div className="divide-border max-h-[150px] divide-y overflow-y-auto rounded-lg border">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3"
              >
                <FileIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{file.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-muted-foreground hover:text-foreground shrink-0 p-1 transition-colors"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TODO Notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <strong>Note:</strong> File upload functionality is coming soon. For
          now, you can create the namespace and upload files later via the API
          or dashboard.
        </p>
      </div>

      <DialogFooter className="flex-row items-center justify-between sm:justify-between">
        <Button type="button" variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={files.length === 0}
          >
            Create Namespace
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}
