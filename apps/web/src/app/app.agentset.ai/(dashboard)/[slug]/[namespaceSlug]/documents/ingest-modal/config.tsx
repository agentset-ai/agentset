import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@agentset/ui/accordion";
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
              name="maxChunkSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max chunk size (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="1024" {...field} />
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
                    <Input placeholder="32" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chunkingStrategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chunking strategy</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? "basic"}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a strategy" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="by_title">By title</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="strategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? "auto"}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a strategy" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                        <SelectItem value="hi_res">Hi-res</SelectItem>
                        <SelectItem value="ocr_only">OCR only</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>

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
