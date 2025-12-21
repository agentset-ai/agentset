import type { UseFormReturn } from "react-hook-form";
import { LLMSelector } from "@/components/llm-selector";
import { RerankerSelector } from "@/components/reranker-selector";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@agentset/ui/accordion";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";
import { Separator } from "@agentset/ui/separator";
import { Textarea } from "@agentset/ui/textarea";

import type { HostingFormValues } from "../../use-hosting-form";

interface AIEngineTabProps {
  form: UseFormReturn<HostingFormValues>;
}

export function AIEngineTab({ form }: AIEngineTabProps) {
  return (
    <div className="space-y-10">
      <section>
        <div>
          <h2 className="text-lg font-medium">AI Configuration</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure the AI model and behavior for your assistant
          </p>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="llmModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LLM Model</FormLabel>
                <FormControl>
                  <LLMSelector
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  The language model used to generate responses
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="systemPrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System Prompt</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="h-48 max-h-80 font-mono text-sm"
                    placeholder="Enter your system prompt..."
                  />
                </FormControl>
                <FormDescription>
                  Instructions that define how your AI assistant should behave
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>

      <section>
        <Accordion type="single" collapsible>
          <AccordionItem value="advanced" className="border-none">
            <AccordionTrigger className="hover:bg-muted/50 rounded-md px-3 py-2 hover:no-underline">
              <div className="flex flex-col items-start gap-1">
                <span className="text-base font-medium">
                  Advanced Configuration
                </span>
                <span className="text-muted-foreground text-sm font-normal">
                  Reranking, retrieval limits, and citation settings
                </span>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-3 pt-4">
              <div className="flex flex-col gap-6">
                <FormField
                  control={form.control}
                  name="rerankModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reranker Model</FormLabel>
                      <FormControl>
                        <RerankerSelector
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Model used to rerank retrieved documents for better
                        relevance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="topK"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Top K</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1}
                            max={100}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Documents to retrieve from vector store (1-100)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rerankLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rerank Limit</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1}
                            max={100}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Documents after reranking (1-100)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="citationMetadataPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Citation Metadata Path</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. title or foo.bar" />
                      </FormControl>
                      <FormDescription>
                        Optional path for citation names. Use dot notation for
                        nested fields (e.g., "foo.bar").
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
