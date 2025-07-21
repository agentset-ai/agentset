"use client";

import { useEffect, useMemo } from "react";
import { camelCaseToWords, capitalize } from "@/lib/string-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import {
  Button,
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Logo,
  RadioButton,
  RadioGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agentset/ui";
import { EmbeddingConfigSchema } from "@agentset/validation";

import { embeddingModels } from "./models";

const formSchema = z.object({
  embeddingModel: EmbeddingConfigSchema.optional(),
});

export default function CreateNamespaceEmbeddingStep({
  onSubmit,
  onBack,
  defaultValues,
}: {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  onBack: () => void;
  defaultValues?: Partial<z.infer<typeof formSchema>>;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // when the provider changes, set the model to the default model for the provider
  const currentEmbeddingProvider = form.watch("embeddingModel")?.provider;

  useEffect(() => {
    if (currentEmbeddingProvider) {
      const model = embeddingModels.find(
        (p) => p.value === currentEmbeddingProvider,
      )?.models[0];

      // reset other fields in the embeddingModel object
      form.resetField("embeddingModel", {
        defaultValue: {
          provider: currentEmbeddingProvider,
          model,
        } as z.infer<typeof EmbeddingConfigSchema>,
      });
    } else {
      form.setValue("embeddingModel", undefined);
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmbeddingProvider]);

  const currentEmbeddingOptions = useMemo(() => {
    const shape =
      EmbeddingConfigSchema.optionsMap.get(currentEmbeddingProvider)?.shape ??
      {};
    return {
      fields: Object.keys(shape).filter(
        (key) => key !== "provider" && key !== "model",
      ),
      shape,
    };
  }, [currentEmbeddingProvider]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="embeddingModel.provider"
            render={({ field }) => (
              <FormItem className="mt-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={(newValue) => {
                      if (newValue === "agentset") {
                        form.setValue("embeddingModel", undefined);
                      } else {
                        field.onChange(newValue);
                      }
                    }}
                    defaultValue={
                      (field.value as typeof field.value | undefined) ??
                      "agentset"
                    }
                    className="grid grid-cols-3 gap-4"
                  >
                    <RadioButton
                      value="agentset"
                      label="Agentset"
                      icon={Logo}
                      note="Default"
                    />

                    {embeddingModels.map((provider) => (
                      <RadioButton
                        key={provider.value}
                        value={provider.value}
                        label={capitalize(provider.value.split("_").join(" "))!}
                        icon={provider.icon}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          {currentEmbeddingProvider && (
            <FormField
              control={form.control}
              name="embeddingModel.model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Select
                      defaultValue={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-xs">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>

                      <SelectContent>
                        {embeddingModels
                          .find((p) => p.value === currentEmbeddingProvider)
                          ?.models.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* render other fields based on the provider dynamically */}
          {currentEmbeddingProvider ? (
            currentEmbeddingOptions.fields.map((key) => (
              <FormField
                key={key}
                control={form.control}
                name={
                  `embeddingModel.${key}` as `embeddingModel.${keyof z.infer<typeof EmbeddingConfigSchema>}`
                }
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {camelCaseToWords(key)}{" "}
                      {currentEmbeddingOptions.shape[
                        key
                      ]?.isOptional() ? null : (
                        <span className="text-destructive-foreground">*</span>
                      )}
                    </FormLabel>

                    <FormControl>
                      <Input {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            ))
          ) : (
            <div className="flex flex-col gap-2">
              <Label data-slot="form-label">Model</Label>

              <Select disabled value="default">
                <SelectTrigger className="w-xs">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="default">
                    OpenAI / text-embedding-3-large
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="mt-10 flex-row items-center justify-between sm:justify-between">
          <p className="text-muted-foreground text-xs">
            Can't find the model you need?{" "}
            <a
              href="mailto:support@agentset.ai"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              Contact us
            </a>
          </p>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit">Next</Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}
