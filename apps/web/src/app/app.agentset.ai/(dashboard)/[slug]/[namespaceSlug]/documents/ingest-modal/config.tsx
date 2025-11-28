import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { useOrganization } from "@/hooks/use-organization";

import { isFreePlan } from "@agentset/stripe/plans";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@agentset/ui/accordion";
import { Checkbox } from "@agentset/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agentset/ui/select";
import { Textarea } from "@agentset/ui/textarea";

// Default values shown in UI (not sent to API unless changed)
const DEFAULTS = {
  chunkSize: "2048",
  mode: "balanced",
} as const;

interface IngestConfigProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  /** Hide file-specific options (forceOcr, mode, image extraction, etc.) */
  minimal?: boolean;
}

export default function IngestConfig({
  form,
  minimal = false,
}: IngestConfigProps) {
  const [metadataStr, setMetadataStr] = useState("");
  const { plan } = useOrganization();
  const isFree = isFreePlan(plan);

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="chunking-settings">
        <AccordionTrigger className="hover:bg-muted/70 items-center justify-start rounded-none px-2 duration-75 hover:no-underline">
          Chunking Settings
        </AccordionTrigger>

        <AccordionContent className="mt-6 flex flex-col gap-6 px-2">
          <FormField
            control={form.control}
            name="metadata"
            render={({ field }: { field: FieldValues }) => (
              <FormItem>
                <FormLabel>Metadata JSON (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    value={metadataStr}
                    onChange={(e) => {
                      const str = e.target.value;
                      setMetadataStr(str);

                      if (str === "") {
                        field.onChange(undefined);
                        return;
                      }

                      try {
                        field.onChange(JSON.parse(str));
                      } catch {
                        field.onChange("");
                      }
                    }}
                    placeholder='{ "foo": "bar" }'
                    className="h-24"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="chunkSize"
            render={({ field }: { field: FieldValues }) => (
              <FormItem>
                <FormLabel>Chunk Size</FormLabel>
                <FormControl>
                  <Input
                    placeholder={DEFAULTS.chunkSize}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === "" ? undefined : Number(val));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!minimal && (
            <>
              <FormField
                control={form.control}
                name="languageCode"
                render={({ field }: { field: FieldValues }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <FormControl>
                      <Input placeholder="en, fr, ar, ..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mode"
                render={({ field }: { field: FieldValues }) => (
                  <FormItem>
                    <FormLabel>Mode</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? DEFAULTS.mode}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fast">Fast</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="accurate" disabled={isFree}>
                            Accurate
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CheckboxField form={form} name="forceOcr" label="Force OCR" />

              <CheckboxField
                form={form}
                name="disableImageExtraction"
                label="Disable image extraction"
              />

              <CheckboxField
                form={form}
                name="disableOcrMath"
                label="Disable OCR math"
              />

              <CheckboxField
                form={form}
                name="useLlm"
                label="Use LLM-enhanced parsing"
              />
            </>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

interface CheckboxFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  name: string;
  label: string;
}

function CheckboxField({ form, name, label }: CheckboxFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }: { field: FieldValues }) => (
        <FormItem>
          <div className="flex items-center gap-2">
            <FormControl>
              <Checkbox
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <FormLabel className="font-normal">{label}</FormLabel>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
