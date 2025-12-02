import type { FieldValues, UseFormReturn } from "react-hook-form";
import { PlusIcon, XIcon } from "lucide-react";

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

export interface BaseIngestFormProps {
  onSuccess: () => void;
}

// extract config and filter values if they're empty or default
export function extractConfig<T extends IngestJobConfig>(
  data: T,
): IngestJobConfig | undefined {
  const config: IngestJobConfig = {};

  if (data.languageCode) config.languageCode = data.languageCode;

  if (data.chunkSize && data.chunkSize !== 2048)
    config.chunkSize = data.chunkSize;

  if (data.mode && data.mode !== "balanced") config.mode = data.mode;
  if (data.forceOcr) config.forceOcr = data.forceOcr;
  if (data.disableImageExtraction)
    config.disableImageExtraction = data.disableImageExtraction;
  if (data.disableOcrMath) config.disableOcrMath = data.disableOcrMath;
  if (data.useLlm === false) config.useLlm = data.useLlm;

  if (data.metadata && Object.keys(data.metadata).length > 0)
    config.metadata = data.metadata;

  return Object.keys(config).length > 0 ? config : undefined;
}

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
              <XIcon className="size-4" />
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
        <PlusIcon className="size-4" />
        {addButtonText}
      </Button>
    </div>
  );
}
