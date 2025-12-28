import type { ReactNode } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useState } from "react";

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

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "jp", name: "Japanese" },
  { code: "kr", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "sv", name: "Swedish" },
  { code: "da", name: "Danish" },
  { code: "no", name: "Norwegian" },
  { code: "fi", name: "Finnish" },
  { code: "cs", name: "Czech" },
  { code: "ro", name: "Romanian" },
  { code: "hu", name: "Hungarian" },
  { code: "he", name: "Hebrew" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "uk", name: "Ukrainian" },
  { code: "fa", name: "Persian" },
];

// Default values shown in UI (not sent to API unless changed)
const DEFAULTS = {
  chunkSize: "2048",
} as const;

interface IngestConfigProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  /** Hide file-specific options (mode, image extraction, etc.) */
  minimal?: boolean;
  /** Additional settings to render at the top of the accordion */
  extraSettings?: ReactNode;
}

export default function IngestConfig({
  form,
  minimal = false,
  extraSettings,
}: IngestConfigProps) {
  const [metadataStr, setMetadataStr] = useState("");

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="chunking-settings">
        <AccordionTrigger className="hover:bg-muted/70 items-center justify-start rounded-none px-2 duration-75 hover:no-underline">
          Additional Settings
        </AccordionTrigger>

        <AccordionContent className="mt-6 flex flex-col gap-6 px-2">
          <FormField
            control={form.control}
            name="metadata"
            render={({ field }: { field: FieldValues }) => (
              <FormItem>
                <FormLabel>Metadata</FormLabel>
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
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(val) =>
                          field.onChange(val === "" ? undefined : val)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Auto-detect" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CheckboxField
                form={form}
                name="disableImageExtraction"
                label="Disable image extraction"
              />

              <CheckboxField
                form={form}
                name="disableImageCaptions"
                label="Disable image captions"
              />

              <CheckboxField
                form={form}
                name="keepPagefooterInOutput"
                label="Keep page footer in output"
              />

              <CheckboxField
                form={form}
                name="keepPageheaderInOutput"
                label="Keep page header in output"
              />

              <CheckboxField
                form={form}
                name="chartUnderstanding"
                label="Enable chart understanding"
              />
            </>
          )}

          {extraSettings}
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
