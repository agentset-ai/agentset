"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, ChevronDownIcon, SparklesIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import type {
  CreateVectorStoreConfig,
  EmbeddingConfig,
} from "@agentset/validation";
import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@agentset/ui/collapsible";
import { DialogFooter } from "@agentset/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { OpenAIIcon } from "@agentset/ui/icons/openai";
import { TurbopufferIcon } from "@agentset/ui/icons/turbopuffer";
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

type ConfigMode = "recommended" | "custom";

export function CustomizeStep({ onSubmit, onBack }: CustomizeStepProps) {
  const [embeddingMode, setEmbeddingMode] = useState<ConfigMode>("recommended");
  const [vectorStoreMode, setVectorStoreMode] =
    useState<ConfigMode>("recommended");

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

  useEffect(() => {
    if (embeddingMode === "custom") {
      const model = providerToModels[currentEmbeddingProvider]?.[0];
      if (model) {
        form.setValue("embeddingModel", {
          provider: currentEmbeddingProvider,
          model,
        } as EmbeddingConfig);
      }
    }
  }, [currentEmbeddingProvider, embeddingMode, form]);

  useEffect(() => {
    if (vectorStoreMode === "custom") {
      form.setValue("vectorStore", {
        provider: currentVectorProvider,
      } as CreateVectorStoreConfig);
    }
  }, [currentVectorProvider, vectorStoreMode, form]);

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

  const handleEmbeddingModeChange = (mode: ConfigMode) => {
    setEmbeddingMode(mode);
    if (mode === "recommended") {
      form.setValue("embeddingModel", {
        provider: "MANAGED_OPENAI",
        model: "text-embedding-3-large",
      });
    }
  };

  const handleVectorStoreModeChange = (mode: ConfigMode) => {
    setVectorStoreMode(mode);
    if (mode === "recommended") {
      form.setValue("vectorStore", {
        provider: "MANAGED_TURBOPUFFER",
      });
    }
  };

  const handleFormSubmit = (values: FormValues) => {
    onSubmit({
      embeddingConfig: values.embeddingModel,
      vectorStoreConfig: values.vectorStore,
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
      >
        <div className="space-y-3">
          <label className="text-sm font-medium">Embedding Model</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleEmbeddingModeChange("recommended")}
              className={cn(
                "hover:border-primary/50 relative flex flex-col items-start gap-4 rounded-xl border p-5 text-left transition-all",
                embeddingMode === "recommended"
                  ? "border-primary bg-primary/5 ring-primary ring-1"
                  : "border-border",
              )}
            >
              {embeddingMode === "recommended" && (
                <div className="bg-primary text-primary-foreground absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full">
                  <CheckIcon className="h-3 w-3" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-xl">
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <span className="font-medium">Recommended</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-background flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm">
                  <OpenAIIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-medium">OpenAI</div>
                  <div className="text-muted-foreground text-xs">
                    text-embedding-3-large
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleEmbeddingModeChange("custom")}
              className={cn(
                "hover:border-primary/50 relative flex flex-col items-start gap-4 rounded-xl border p-5 text-left transition-all",
                embeddingMode === "custom"
                  ? "border-primary bg-primary/5 ring-primary ring-1"
                  : "border-border",
              )}
            >
              {embeddingMode === "custom" && (
                <div className="bg-primary text-primary-foreground absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full">
                  <CheckIcon className="h-3 w-3" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-xl">
                  <Logo className="h-5 w-5" />
                </div>
                <span className="font-medium">Custom</span>
              </div>
              <span className="text-muted-foreground text-sm">
                Choose your own embedding provider and model
              </span>
            </button>
          </div>

          {embeddingMode === "custom" && (
            <Collapsible defaultOpen className="space-y-3">
              <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
                <ChevronDownIcon className="h-3 w-3" />
                Configure embedding model
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="embeddingModel.provider"
                  render={({ field }) => (
                    <FormItem>
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
                          defaultValue={
                            field.value.startsWith("MANAGED_")
                              ? "agentset"
                              : field.value
                          }
                          className="grid grid-cols-3 gap-3"
                        >
                          <RadioButton
                            value="agentset"
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
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a provider" />
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
                            {!key.isOptional && (
                              <span className="text-destructive-foreground">
                                *
                              </span>
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
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Vector Store</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleVectorStoreModeChange("recommended")}
              className={cn(
                "hover:border-primary/50 relative flex flex-col items-start gap-4 rounded-xl border p-5 text-left transition-all",
                vectorStoreMode === "recommended"
                  ? "border-primary bg-primary/5 ring-primary ring-1"
                  : "border-border",
              )}
            >
              {vectorStoreMode === "recommended" && (
                <div className="bg-primary text-primary-foreground absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full">
                  <CheckIcon className="h-3 w-3" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-xl">
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <span className="font-medium">Recommended</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-background flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm">
                  <TurbopufferIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-medium">Turbopuffer</div>
                  <div className="text-muted-foreground text-xs">
                    Managed & optimized
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleVectorStoreModeChange("custom")}
              className={cn(
                "hover:border-primary/50 relative flex flex-col items-start gap-4 rounded-xl border p-5 text-left transition-all",
                vectorStoreMode === "custom"
                  ? "border-primary bg-primary/5 ring-primary ring-1"
                  : "border-border",
              )}
            >
              {vectorStoreMode === "custom" && (
                <div className="bg-primary text-primary-foreground absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full">
                  <CheckIcon className="h-3 w-3" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-xl">
                  <Logo className="h-5 w-5" />
                </div>
                <span className="font-medium">Custom</span>
              </div>
              <span className="text-muted-foreground text-sm">
                Bring your own vector store
              </span>
            </button>
          </div>

          {vectorStoreMode === "custom" && (
            <Collapsible defaultOpen className="space-y-3">
              <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
                <ChevronDownIcon className="h-3 w-3" />
                Configure vector store
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="vectorStore.provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(newValue) => {
                            if (newValue === "agentset") {
                              field.onChange("MANAGED_PINECONE");
                            } else {
                              field.onChange(newValue);
                            }
                          }}
                          defaultValue={
                            field.value.startsWith("MANAGED_")
                              ? "agentset"
                              : field.value
                          }
                          className="grid grid-cols-3 gap-3"
                        >
                          <RadioButton
                            value="agentset"
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
                              note={
                                store.comingSoon ? "Coming Soon" : undefined
                              }
                              noteStyle="muted"
                              disabled={store.comingSoon}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
                            {!key.isOptional && (
                              <span className="text-destructive-foreground">
                                *
                              </span>
                            )}
                          </FormLabel>
                          {key.options ? (
                            <FormControl>
                              <Select
                                value={field.value}
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
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <p className="text-muted-foreground text-xs">
            Configuration cannot be changed later
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
