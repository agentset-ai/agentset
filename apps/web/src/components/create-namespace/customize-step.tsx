"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import type {
  CreateVectorStoreConfig,
  EmbeddingConfig,
} from "@agentset/validation";
import { Button } from "@agentset/ui/button";
import { DialogFooter } from "@agentset/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";
import { Logo } from "@agentset/ui/logo";
import { RadioButton } from "@agentset/ui/radio-button";
import { RadioGroup } from "@agentset/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agentset/ui/select";
import { Separator } from "@agentset/ui/separator";
import { camelCaseToWords, capitalize } from "@agentset/utils";
import {
  createVectorStoreSchema,
  EmbeddingConfigSchema,
} from "@agentset/validation";

import { embeddingModels, vectorStores } from "./models";

const formSchema = z.object({
  embeddingModel: EmbeddingConfigSchema,
  vectorStore: createVectorStoreSchema,
});

type FormValues = z.infer<typeof formSchema>;

const embeddingOptions = EmbeddingConfigSchema.options.map(
  (o) => o.shape.provider.value,
);
const managedEmbeddingOptions = embeddingOptions.filter((o) =>
  o.startsWith("MANAGED_"),
) as Extract<(typeof embeddingOptions)[number], `MANAGED_${string}`>[];

const vectorStoreOptions = createVectorStoreSchema.options.map(
  (o) => o.shape.provider.value,
);
const managedVectorStoreOptions = vectorStoreOptions.filter((o) =>
  o.startsWith("MANAGED_"),
) as Extract<(typeof vectorStoreOptions)[number], `MANAGED_${string}`>[];

const providerToModels = EmbeddingConfigSchema.options.reduce(
  (acc, o) => {
    acc[o.shape.provider.value] = o.shape.model.options;
    return acc;
  },
  {} as Record<EmbeddingConfig["provider"], string[]>,
);

interface CustomizeStepProps {
  onSubmit: (config: {
    embeddingConfig: EmbeddingConfig;
    vectorStoreConfig: CreateVectorStoreConfig;
  }) => void;
  onBack: () => void;
}

export function CustomizeStep({ onSubmit, onBack }: CustomizeStepProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      embeddingModel: {
        provider: "MANAGED_OPENAI",
        model: "text-embedding-3-large",
      },
      vectorStore: {
        provider: "MANAGED_TURBOPUFFER",
      },
    },
  });

  const currentEmbeddingProvider = form.watch("embeddingModel").provider;
  const currentVectorProvider = form.watch("vectorStore").provider;

  const isCurrentEmbeddingProviderManaged = managedEmbeddingOptions.includes(
    currentEmbeddingProvider as (typeof managedEmbeddingOptions)[number],
  );
  const isCurrentVectorProviderManaged = managedVectorStoreOptions.includes(
    currentVectorProvider as (typeof managedVectorStoreOptions)[number],
  );

  // Reset embedding model fields when provider changes
  useEffect(() => {
    const model = providerToModels[currentEmbeddingProvider]?.[0];
    if (model) {
      form.resetField("embeddingModel", {
        defaultValue: {
          provider: currentEmbeddingProvider,
          model,
        } as EmbeddingConfig,
      });
    }
  }, [currentEmbeddingProvider, form]);

  // Reset vector store fields when provider changes
  useEffect(() => {
    form.reset({
      ...form.getValues(),
      vectorStore: {
        provider: currentVectorProvider,
      } as CreateVectorStoreConfig,
    });
  }, [currentVectorProvider, form]);

  const currentEmbeddingOptions = useMemo(() => {
    if (currentEmbeddingProvider.startsWith("MANAGED_")) return [];

    const shape = EmbeddingConfigSchema.options.find(
      (o) => o.shape.provider.value === currentEmbeddingProvider,
    )?.shape;

    if (!shape) return [];

    return Object.keys(shape)
      .filter((key) => key !== "provider" && key !== "model")
      .map((key) => {
        const field = shape[key as keyof typeof shape];
        return {
          name: key,
          isOptional: field.safeParse(undefined).success,
        };
      });
  }, [currentEmbeddingProvider]);

  const currentVectorStoreOptions = useMemo(() => {
    if (currentVectorProvider.startsWith("MANAGED_")) return [];

    const shape = createVectorStoreSchema.options.find(
      (o) => o.shape.provider.value === currentVectorProvider,
    )?.shape;

    if (!shape) return [];

    return Object.keys(shape)
      .filter((key) => key !== "provider")
      .map((key) => {
        const field = shape[key as keyof typeof shape] as z.ZodType;
        return {
          name: key,
          isOptional: field.safeParse(undefined).success,
          options:
            field instanceof z.ZodEnum
              ? (field.options as string[])
              : undefined,
        };
      });
  }, [currentVectorProvider]);

  const handleFormSubmit = (values: FormValues) => {
    onSubmit({
      embeddingConfig: values.embeddingModel,
      vectorStoreConfig: values.vectorStore,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        <div className="flex gap-6">
          <div className="flex flex-1 flex-col gap-4">
            <FormField
              control={form.control}
              name="embeddingModel.provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Embedding Model</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(newValue) => {
                        if (newValue === "agentset") {
                          form.setValue("embeddingModel", {
                            provider: "MANAGED_OPENAI",
                            model: "text-embedding-3-large",
                          });
                        } else {
                          field.onChange(newValue);
                        }
                      }}
                      value={
                        field.value.startsWith("MANAGED_")
                          ? "agentset"
                          : field.value
                      }
                      className="grid grid-cols-2 gap-3"
                    >
                      <RadioButton
                        value="agentset"
                        id="embedding-agentset"
                        label="Managed"
                        icon={Logo}
                        note="Default"
                      />

                      {embeddingModels.map((provider) => (
                        <RadioButton
                          key={provider.value}
                          value={provider.value}
                          label={
                            capitalize(provider.value.split("_").join(" "))!
                          }
                          icon={provider.icon}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isCurrentEmbeddingProviderManaged && (
              <FormField
                control={form.control}
                name="embeddingModel.provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Select
                        defaultValue={field.value}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {managedEmbeddingOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {capitalize(option.replace("MANAGED_", ""))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

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
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerToModels[currentEmbeddingProvider]?.map(
                          (model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isCurrentEmbeddingProviderManaged &&
              currentEmbeddingOptions.map((key) => (
                <FormField
                  key={key.name}
                  control={form.control}
                  name={
                    `embeddingModel.${key.name}` as `embeddingModel.${keyof z.infer<typeof EmbeddingConfigSchema>}`
                  }
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {camelCaseToWords(key.name)}{" "}
                        {key.isOptional ? null : (
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
              ))}
          </div>

          <Separator orientation="vertical" className="h-auto" />

          <div className="flex flex-1 flex-col gap-4">
            <FormField
              control={form.control}
              name="vectorStore.provider"
              render={({ field }) => {
                const vectorStoreRadioValue = field.value.startsWith("MANAGED_")
                  ? "agentset"
                  : field.value;
                return (
                  <FormItem>
                    <FormLabel className="text-base">Vector Store</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(newValue) => {
                          if (newValue === "agentset") {
                            form.setValue("vectorStore", {
                              provider: "MANAGED_TURBOPUFFER",
                            });
                          } else {
                            field.onChange(newValue);
                          }
                        }}
                        value={vectorStoreRadioValue}
                        className="grid grid-cols-2 gap-3"
                      >
                        <RadioButton
                          value="agentset"
                          id="vectorstore-agentset"
                          label="Managed"
                          icon={Logo}
                          note="Default"
                        />

                        {vectorStores.map((store) => (
                          <RadioButton
                            key={store.value}
                            value={store.value}
                            label={capitalize(store.value)!}
                            icon={store.icon}
                            note={store.comingSoon ? "Coming Soon" : undefined}
                            noteStyle="muted"
                            disabled={store.comingSoon}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {isCurrentVectorProviderManaged ? (
              <FormField
                control={form.control}
                name="vectorStore.provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vector Store</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vector store" />
                        </SelectTrigger>
                        <SelectContent>
                          {managedVectorStoreOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {capitalize(option.replace("MANAGED_", ""))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              currentVectorStoreOptions.map((key) => (
                <FormField
                  key={key.name}
                  control={form.control}
                  name={
                    `vectorStore.${key.name}` as `vectorStore.${keyof CreateVectorStoreConfig}`
                  }
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {camelCaseToWords(key.name)}{" "}
                        {key.isOptional ? null : (
                          <span className="text-destructive-foreground">*</span>
                        )}
                      </FormLabel>
                      {key.options ? (
                        <FormControl>
                          <Select
                            value={field.value}
                            defaultValue={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {key.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      ) : (
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))
            )}
          </div>
        </div>

        <DialogFooter className="mt-8 flex-row items-center justify-between sm:justify-between">
          <p className="text-muted-foreground text-xs">
            Can't find what you need?{" "}
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
            <Button type="submit">Continue</Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}
