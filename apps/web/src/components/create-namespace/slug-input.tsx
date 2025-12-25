"use client";

import { useEffect, useState } from "react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, LoaderIcon, XIcon } from "lucide-react";
import { useDebounceValue } from "usehooks-ts";

import { cn } from "@agentset/ui/cn";
import { Input } from "@agentset/ui/input";
import { Label } from "@agentset/ui/label";
import { toSlug } from "@agentset/utils";

type SlugMode = "auto" | "edit";

interface SlugInputProps {
  orgId: string;
  name: string;
  value: string;
  onChange: (slug: string) => void;
  onValidationChange?: (isValid: boolean | null, isValidating: boolean) => void;
}

export function SlugInput({
  orgId,
  name,
  value,
  onChange,
  onValidationChange,
}: SlugInputProps) {
  const [mode, setMode] = useState<SlugMode>("auto");
  const [debouncedSlug] = useDebounceValue(value, 500);

  const trpc = useTRPC();

  useEffect(() => {
    if (mode === "auto") {
      const newSlug = toSlug(name);
      onChange(newSlug);
    }
  }, [name, mode, onChange]);

  const {
    data: slugExists,
    isLoading: isValidating,
    isFetched,
  } = useQuery({
    ...trpc.namespace.checkSlug.queryOptions({
      orgId,
      slug: debouncedSlug,
    }),
    enabled: debouncedSlug.length >= 2,
  });

  useEffect(() => {
    if (onValidationChange) {
      const isValid =
        isFetched && debouncedSlug.length >= 2 ? !slugExists : null;
      onValidationChange(isValid, isValidating);
    }
  }, [slugExists, isValidating, isFetched, debouncedSlug, onValidationChange]);

  const handleModeToggle = (newMode: SlugMode) => {
    setMode(newMode);
    if (newMode === "auto") {
      onChange(toSlug(name));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    onChange(sanitized);
  };

  const showValidation = debouncedSlug.length >= 2 && isFetched;
  const isAvailable = showValidation && !slugExists;
  const isTaken = showValidation && slugExists;

  return (
    <div className="space-y-2 flex-1">
      <div className="flex items-center justify-between">
        <Label htmlFor="slug">Slug</Label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleModeToggle("auto")}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              mode === "auto"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            Auto
          </button>
          <button
            type="button"
            onClick={() => handleModeToggle("edit")}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              mode === "edit"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            Edit
          </button>
        </div>
      </div>

      <div className="relative">
        <Input
          id="slug"
          value={value}
          onChange={handleSlugChange}
          disabled={mode === "auto"}
          placeholder="my-namespace"
          className={cn(
            "pr-8",
            mode === "auto" && "bg-muted text-muted-foreground",
          )}
        />
        <div className="absolute top-1/2 right-2 -translate-y-1/2">
          {isValidating && (
            <LoaderIcon className="text-muted-foreground h-4 w-4 animate-spin" />
          )}
          {!isValidating && isAvailable && (
            <CheckIcon className="h-4 w-4 text-green-500" />
          )}
          {!isValidating && isTaken && (
            <XIcon className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>

      <div className="h-4 text-xs ml-2">
        {!isValidating && isAvailable && (
          <span className="text-green-600 dark:text-green-500">
            Slug is available
          </span>
        )}
        {!isValidating && isTaken && (
          <span className="text-red-600 dark:text-red-500">
            Slug is already taken
          </span>
        )}
        {value.length > 0 && value.length < 2 && (
          <span className="text-muted-foreground">
            Slug must be at least 2 characters
          </span>
        )}
      </div>
    </div>
  );
}
