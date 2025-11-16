import type { UseFormReturn } from "react-hook-form";
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

export default function IngestConfig({
  form,
}: {
  form: UseFormReturn<any, any, any>;
}) {
  const [metadata, setMetadata] = useState<string>("");

  return (
    <>
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger className="hover:bg-muted/70 items-center justify-start rounded-none duration-75 hover:no-underline">
            Chunking Settings
          </AccordionTrigger>

          <AccordionContent className="mt-6 flex flex-col gap-6">
            <FormField
              control={form.control}
              name="chunkSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chunk size (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="512" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chunkOverlap"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chunk overlap (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="128" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minSentencesPerChunk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min sentences per chunk (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="1" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="languageCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language code (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="en, fr, pt-BR, ..." {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Processing mode (optional)</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "default" ? undefined : value)
                      }
                      value={field.value ?? "default"}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a mode" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="default">Use default</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="accurate">Accurate</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="forceOcr"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? true : undefined)
                        }
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Force OCR (leave unchecked to use default)
                    </FormLabel>
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="disableImageExtraction"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? true : undefined)
                        }
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Disable image extraction (leave unchecked to use default)
                    </FormLabel>
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="disableOcrMath"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? true : undefined)
                        }
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Disable OCR math (leave unchecked to use default)
                    </FormLabel>
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="useLlm"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? true : undefined)
                        }
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Use LLM-enhanced parsing (leave unchecked to use default)
                    </FormLabel>
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metadata"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metadata JSON (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      value={metadata}
                      onChange={(e) => {
                        const str = e.target.value;
                        setMetadata(str);
                        if (str === "") {
                          field.onChange(undefined);
                          return;
                        }

                        try {
                          field.onChange(JSON.parse(str));
                        } catch (error) {
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}
