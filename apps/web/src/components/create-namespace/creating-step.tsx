"use client";

import { CheckCircleIcon, FolderIcon } from "lucide-react";

import { Spinner } from "@agentset/ui/spinner";

interface CreatingStepProps {
  namespaceName: string;
  isComplete?: boolean;
}

export function CreatingStep({
  namespaceName,
  isComplete = false,
}: CreatingStepProps) {
  if (isComplete) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-500" />
        </div>

        <h3 className="text-lg font-semibold">Namespace Created!</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {namespaceName && `"${namespaceName}" has been successfully created.`}
        </p>

        <div className="mt-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
          <Spinner className="h-4 w-4" />
          <span>Redirecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="relative mb-4">
        <div className="border-primary/20 flex h-16 w-16 items-center justify-center rounded-full border-4">
          <FolderIcon className="text-primary h-8 w-8" />
        </div>
      </div>

      <h3 className="text-lg font-semibold">Creating Your Namespace</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        {namespaceName && `Setting up "${namespaceName}"...`}
      </p>

      <div className="mt-4">
        <Spinner className="h-6 w-6" />
      </div>

      <div className="bg-muted mt-6 h-1 w-full max-w-xs overflow-hidden rounded-full">
        <div
          className="bg-primary h-full w-1/3 animate-pulse rounded-full"
          style={{
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}
