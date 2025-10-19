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
  CreateVectorStoreConfig,
  createVectorStoreSchema,
} from "@agentset/validation";

import { vectorStores } from "./models";

const formSchema = z.object({
  vectorStore: createVectorStoreSchema,
});

const options = createVectorStoreSchema.options.map(
  (o) => o.shape.provider.value,
);

const managedOptions = options.filter((o) =>
  o.startsWith("MANAGED_"),
) as Extract<(typeof options)[number], `MANAGED_${string}`>[];

export default function CreateNamespaceVectorStoreStep({
  onSubmit,
  onBack,
  isLoading,
}: {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
  onBack: () => void;
}) {
  const form = useForm({
    resolver: zodResolver(formSchema, undefined),
    defaultValues: {
      vectorStore: {
        provider: "MANAGED_PINECONE",
      },
    },
  });

  const currentVectorProvider = form.watch("vectorStore").provider;
  const isCurrentVectorProviderManaged = managedOptions.includes(
    currentVectorProvider as (typeof managedOptions)[number],
  );

  useEffect(() => {
    // reset other fields in the vectorStore object
    form.reset({
      vectorStore: {
        provider: currentVectorProvider,
      } as CreateVectorStoreConfig,
    });
  }, [currentVectorProvider]);

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="vectorStore.provider"
            render={({ field }) => (
              <FormItem className="mt-3">
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
                    className="grid grid-cols-3 gap-4"
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
                        note={store.comingSoon ? "Coming Soon" : undefined}
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

          {/* if the vector store is not managed, render the fields, otherwise show the managed options */}
          {!isCurrentVectorProviderManaged ? (
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
                          <SelectTrigger className="w-xs">
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
          ) : (
            <FormField
              control={form.control}
              name={"vectorStore.provider"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vector Store</FormLabel>

                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-xs">
                        <SelectValue placeholder="Select a vector store" />
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
        </div>

        <DialogFooter className="mt-10 flex-row items-center justify-between sm:justify-between">
          <p className="text-muted-foreground text-xs">
            Can't find the vector store you need?{" "}
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
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Create
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}
