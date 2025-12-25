"use client";

import { useEffect, useMemo, useState } from "react";
import {
  embeddingModels,
  vectorStores,
} from "@/components/create-namespace/models";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  SettingsIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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

import {
  MANAGED_EMBEDDING_CONFIG,
  MANAGED_VECTOR_STORE_CONFIG,
} from "../_constants";

// Form schema
const formSchema = z.object({
  embeddingType: z.enum(["recommended", "custom"]),
  embeddingConfig: EmbeddingConfigSchema.optional(),
  vectorStoreType: z.enum(["recommended", "custom"]),
  vectorStoreConfig: createVectorStoreSchema.optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Get provider options from schema
const embeddingProviderOptions = EmbeddingConfigSchema.options.map(
  (o) => o.shape.provider.value,
);
const customEmbeddingProviders = embeddingProviderOptions.filter(
  (o) => !o.startsWith("MANAGED_"),
);
const providerToEmbeddingModels = EmbeddingConfigSchema.options.reduce(
  (acc, o) => {
    acc[o.shape.provider.value] = o.shape.model.options;
    return acc;
  },
  {} as Record<EmbeddingConfig["provider"], string[]>,
);

const vectorStoreProviderOptions = createVectorStoreSchema.options.map(
  (o) => o.shape.provider.value,
);
const customVectorStoreProviders = vectorStoreProviderOptions.filter(
  (o) => !o.startsWith("MANAGED_"),
);

interface NamespaceConfigProps {
  onSubmit: (config: {
    embeddingConfig?: EmbeddingConfig;
    vectorStoreConfig?: CreateVectorStoreConfig;
  }) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function NamespaceConfig({
  onSubmit,
  onBack,
  isLoading,
}: NamespaceConfigProps) {
  const [embeddingExpanded, setEmbeddingExpanded] = useState(false);
  const [vectorStoreExpanded, setVectorStoreExpanded] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      embeddingType: "recommended",
      vectorStoreType: "recommended",
    },
  });

  const embeddingType = form.watch("embeddingType");
  const vectorStoreType = form.watch("vectorStoreType");
  const currentEmbeddingProvider = form.watch("embeddingConfig.provider");
  const currentVectorStoreProvider = form.watch("vectorStoreConfig.provider");

  // Reset embedding config when switching to custom
  useEffect(() => {
    if (embeddingType === "custom" && !currentEmbeddingProvider) {
      const firstProvider = customEmbeddingProviders[0];
      if (firstProvider) {
        form.setValue("embeddingConfig", {
          provider: firstProvider,
          model: providerToEmbeddingModels[firstProvider]?.[0] ?? "",
        } as EmbeddingConfig);
      }
    }
  }, [embeddingType, currentEmbeddingProvider, form]);

  // Reset vector store config when switching to custom
  useEffect(() => {
    if (vectorStoreType === "custom" && !currentVectorStoreProvider) {
      const firstProvider = customVectorStoreProviders[0];
      if (firstProvider) {
        form.setValue("vectorStoreConfig", {
          provider: firstProvider,
        } as CreateVectorStoreConfig);
      }
    }
  }, [vectorStoreType, currentVectorStoreProvider, form]);

  // Reset embedding model when provider changes
  useEffect(() => {
    if (
      currentEmbeddingProvider &&
      !currentEmbeddingProvider.startsWith("MANAGED_")
    ) {
      const models = providerToEmbeddingModels[currentEmbeddingProvider];
      if (models?.[0]) {
        form.setValue("embeddingConfig", {
          provider: currentEmbeddingProvider,
          model: models[0],
        } as EmbeddingConfig);
      }
    }
  }, [currentEmbeddingProvider, form]);

  // Get current embedding options (extra fields beyond provider/model)
  const currentEmbeddingOptions = useMemo(() => {
    if (
      !currentEmbeddingProvider ||
      currentEmbeddingProvider.startsWith("MANAGED_")
    )
      return [];

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

  // Get current vector store options
  const currentVectorStoreOptions = useMemo(() => {
    if (
      !currentVectorStoreProvider ||
      currentVectorStoreProvider.startsWith("MANAGED_")
    )
      return [];

    const shape = createVectorStoreSchema.options.find(
      (o) => o.shape.provider.value === currentVectorStoreProvider,
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
  }, [currentVectorStoreProvider]);

  const handleSubmit = (values: FormValues) => {
    const embeddingConfig =
      values.embeddingType === "recommended"
        ? MANAGED_EMBEDDING_CONFIG
        : values.embeddingConfig;

    const vectorStoreConfig =
      values.vectorStoreType === "recommended"
        ? MANAGED_VECTOR_STORE_CONFIG
        : values.vectorStoreConfig;

    onSubmit({
      embeddingConfig,
      vectorStoreConfig,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col"
    >
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <h2 className="text-2xl font-semibold tracking-tight">
          Configure Your Namespace
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose how to embed and store your data
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Embedding Model Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wide uppercase">
              Embedding Model
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <ConfigOption
                selected={embeddingType === "recommended"}
                onClick={() => {
                  form.setValue("embeddingType", "recommended");
                  setEmbeddingExpanded(false);
                }}
                icon={<Logo className="h-5 w-5" />}
                title="Recommended"
                description="OpenAI text-embedding-3-large, managed by Agentset"
              />
              <ConfigOption
                selected={embeddingType === "custom"}
                onClick={() => {
                  form.setValue("embeddingType", "custom");
                  setEmbeddingExpanded(true);
                }}
                icon={<SettingsIcon className="h-5 w-5" />}
                title="Custom"
                description="Bring your own API keys"
              />
            </div>

            {/* Custom Embedding Config */}
            <AnimatePresence>
              {embeddingType === "custom" && (
                <Collapsible
                  open={embeddingExpanded}
                  onOpenChange={setEmbeddingExpanded}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between py-2 text-sm transition-colors"
                    >
                      <span>Configure embedding model</span>
                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 transition-transform",
                          embeddingExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-muted/50 space-y-4 rounded-lg border p-4"
                    >
                      {/* Provider Select */}
                      <FormField
                        control={form.control}
                        name="embeddingConfig.provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provider</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {embeddingModels.map((provider) => (
                                  <SelectItem
                                    key={provider.value}
                                    value={provider.value}
                                  >
                                    {capitalize(
                                      provider.value.split("_").join(" "),
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Model Select */}
                      {currentEmbeddingProvider && (
                        <FormField
                          control={form.control}
                          name="embeddingConfig.model"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select model" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {providerToEmbeddingModels[
                                    currentEmbeddingProvider
                                  ]?.map((model) => (
                                    <SelectItem key={model} value={model}>
                                      {model}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Extra fields */}
                      {currentEmbeddingOptions.map((opt) => (
                        <FormField
                          key={opt.name}
                          control={form.control}
                          name={
                            `embeddingConfig.${opt.name}` as `embeddingConfig.${keyof EmbeddingConfig}`
                          }
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {camelCaseToWords(opt.name)}
                                {!opt.isOptional && (
                                  <span className="text-destructive ml-1">
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
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </AnimatePresence>
          </div>

          {/* Vector Store Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wide uppercase">
              Vector Store
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <ConfigOption
                selected={vectorStoreType === "recommended"}
                onClick={() => {
                  form.setValue("vectorStoreType", "recommended");
                  setVectorStoreExpanded(false);
                }}
                icon={<Logo className="h-5 w-5" />}
                title="Recommended"
                description="Turbopuffer, managed by Agentset"
              />
              <ConfigOption
                selected={vectorStoreType === "custom"}
                onClick={() => {
                  form.setValue("vectorStoreType", "custom");
                  setVectorStoreExpanded(true);
                }}
                icon={<SettingsIcon className="h-5 w-5" />}
                title="Custom"
                description="Bring your own credentials"
              />
            </div>

            {/* Custom Vector Store Config */}
            <AnimatePresence>
              {vectorStoreType === "custom" && (
                <Collapsible
                  open={vectorStoreExpanded}
                  onOpenChange={setVectorStoreExpanded}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between py-2 text-sm transition-colors"
                    >
                      <span>Configure vector store</span>
                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 transition-transform",
                          vectorStoreExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-muted/50 space-y-4 rounded-lg border p-4"
                    >
                      {/* Provider Select */}
                      <FormField
                        control={form.control}
                        name="vectorStoreConfig.provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provider</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {vectorStores
                                  .filter((vs) => !vs.comingSoon)
                                  .map((store) => (
                                    <SelectItem
                                      key={store.value}
                                      value={store.value}
                                    >
                                      {capitalize(store.value)}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Extra fields */}
                      {currentVectorStoreOptions.map((opt) => (
                        <FormField
                          key={opt.name}
                          control={form.control}
                          name={
                            `vectorStoreConfig.${opt.name}` as `vectorStoreConfig.${keyof CreateVectorStoreConfig}`
                          }
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {camelCaseToWords(opt.name)}
                                {!opt.isOptional && (
                                  <span className="text-destructive ml-1">
                                    *
                                  </span>
                                )}
                              </FormLabel>
                              {opt.options ? (
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select option" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {opt.options.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button type="submit" isLoading={isLoading} disabled={isLoading}>
              Create Namespace
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
}

// Config option card component
function ConfigOption({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start rounded-lg border p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 ring-primary/20 ring-2"
          : "hover:border-muted-foreground/30 hover:bg-muted/50",
      )}
    >
      {selected && (
        <div className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full">
          <CheckIcon className="h-3 w-3" />
        </div>
      )}
      <div
        className={cn(
          "mb-2 flex h-10 w-10 items-center justify-center rounded-lg",
          selected
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <h4 className="font-medium">{title}</h4>
      <p className="text-muted-foreground mt-1 text-xs">{description}</p>
    </button>
  );
}
