import type { FieldValues, UseFormReturn } from "react-hook-form";
import { Trash2Icon } from "lucide-react";

import type { IngestJobConfig } from "@agentset/validation";
import { Button } from "@agentset/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";

// ============================================================================
// Types
// ============================================================================

export interface BaseIngestFormProps {
  onSuccess: () => void;
}

// ============================================================================
// Config Utilities
// ============================================================================

/**
 * Extract config from form data, removing undefined values.
 * Only includes fields that were explicitly set by the user.
 */
export function extractConfig<T extends IngestJobConfig>(
  data: T,
): IngestJobConfig | undefined {
  const config: IngestJobConfig = {};

  if (data.chunkSize !== undefined) config.chunkSize = data.chunkSize;
  if (data.languageCode !== undefined) config.languageCode = data.languageCode;
  if (data.forceOcr !== undefined) config.forceOcr = data.forceOcr;
  if (data.mode !== undefined) config.mode = data.mode;
  if (data.disableImageExtraction !== undefined)
    config.disableImageExtraction = data.disableImageExtraction;
  if (data.disableOcrMath !== undefined)
    config.disableOcrMath = data.disableOcrMath;
  if (data.useLlm !== undefined) config.useLlm = data.useLlm;
  if (data.metadata !== undefined) config.metadata = data.metadata;

  return Object.keys(config).length > 0 ? config : undefined;
}

// ============================================================================
// Reusable Components
// ============================================================================

interface DynamicArrayFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  name: string;
  label?: string;
  placeholder?: string;
  addButtonText: string;
  inputType?: "text" | "url";
  showLabelOnFirstOnly?: boolean;
}

/**
 * Dynamic array field for adding/removing string inputs
 */
export function DynamicArrayField({
  form,
  name,
  label,
  placeholder,
  addButtonText,
  inputType = "text",
  showLabelOnFirstOnly = false,
}: DynamicArrayFieldProps) {
  const values = (form.watch(name) as string[] | undefined) ?? [];

  const addItem = () => {
    const current = (form.getValues(name) as string[] | undefined) ?? [];
    form.setValue(name, [...current, ""]);
  };

  const removeItem = (index: number) => {
    const current = (form.getValues(name) as string[] | undefined) ?? [];
    if (current.length <= 1) return;
    form.setValue(
      name,
      current.filter((_, i) => i !== index),
    );
  };

  return (
    <div className="flex flex-col gap-1">
      {label && !showLabelOnFirstOnly && <FormLabel>{label}</FormLabel>}
      {values.map((_, index) => (
        <div key={index} className="flex items-end gap-2">
          <div className="flex-1">
            <FormField
              control={form.control}
              name={`${name}.${index}`}
              render={({ field }: { field: FieldValues }) => (
                <FormItem>
                  {showLabelOnFirstOnly && index === 0 && label && (
                    <FormLabel>{label}</FormLabel>
                  )}
                  <FormControl>
                    <Input
                      type={inputType}
                      placeholder={placeholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {values.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        className="mt-1 w-fit"
        onClick={addItem}
      >
        {addButtonText}
      </Button>
    </div>
  );
}
