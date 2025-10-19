import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

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
import { Label } from "@agentset/ui/label";
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
import { EmbeddingConfig, EmbeddingConfigSchema } from "@agentset/validation";

import { embeddingModels } from "./models";

const formSchema = z.object({
  embeddingModel: EmbeddingConfigSchema,
});

const options = EmbeddingConfigSchema.options.map(
  (o) => o.shape.provider.value,
);

const managedOptions = options.filter((o) =>
  o.startsWith("MANAGED_"),
) as Extract<(typeof options)[number], `MANAGED_${string}`>[];

const providerToModels = EmbeddingConfigSchema.options.reduce(
  (acc, o) => {
    acc[o.shape.provider.value] = o.shape.model.options;
    return acc;
  },
  {} as Record<EmbeddingConfig["provider"], string[]>,
);

export default function CreateNamespaceEmbeddingStep({
  onSubmit,
  onBack,
  defaultValues,
}: {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  onBack: () => void;
  defaultValues?: z.infer<typeof formSchema>;
}) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? {
      embeddingModel: {
        provider: "MANAGED_OPENAI",
        model: "text-embedding-3-large",
      },
    },
  });

  // when the provider changes, set the model to the default model for the provider
  const currentEmbeddingProvider = form.watch("embeddingModel").provider;
  const isCurrentEmbeddingProviderManaged = managedOptions.includes(
    currentEmbeddingProvider as (typeof managedOptions)[number],
  );

  useEffect(() => {
    const model = providerToModels[currentEmbeddingProvider][0];

    // reset other fields in the embeddingModel object
    form.resetField("embeddingModel", {
      defaultValue: {
        provider: currentEmbeddingProvider,
        model,
      } as EmbeddingConfig,
    });
  }, [currentEmbeddingProvider]);

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
                    className="grid grid-cols-3 gap-4"
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

          {isCurrentEmbeddingProviderManaged && (
            <FormField
              control={form.control}
              name={"embeddingModel.provider"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>

                  <FormControl>
                    <Select
                      defaultValue={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-xs">
                        <SelectValue placeholder="Select a model provider" />
                      </SelectTrigger>

                      <SelectContent>
                        {managedOptions.map((option) => (
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
                    <SelectTrigger className="w-xs">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>

                    <SelectContent>
                      {providerToModels[currentEmbeddingProvider].map(
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

          {/* if the embedding provider is not managed, render the fields, otherwise show the managed options */}
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
