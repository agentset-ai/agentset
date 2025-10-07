import { useEffect, useMemo } from "react";
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
import { camelCaseToWords, capitalize } from "@agentset/utils";
import { VectorStoreSchema } from "@agentset/validation";

import { vectorStores } from "./models";

const formSchema = z.object({
  vectorStore: VectorStoreSchema.optional(),
});

const defaultVectorStore = "Pinecone";

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
  });

  // when the provider changes, set the model to the default model for the provider
  const currentVectorProvider = form.watch("vectorStore")?.provider;

  useEffect(() => {
    if (currentVectorProvider) {
      // reset other fields in the embeddingModel object
      form.reset({
        vectorStore: {
          provider: currentVectorProvider,
        } as z.infer<typeof VectorStoreSchema>,
      });
    } else {
      form.setValue("vectorStore", undefined);
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVectorProvider]);

  const currentVectorStoreOptions = useMemo(() => {
    const shape = VectorStoreSchema.options.find(
      (o) => o.shape.provider.value === currentVectorProvider,
    )?.shape;

    if (!shape) return [];

    return Object.keys(shape)
      .filter((key) => key !== "provider")
      .map((key) => {
        const field = shape[key as keyof typeof shape];

        return {
          name: key,
          isOptional: field.safeParse(undefined).success,
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
                        form.setValue("vectorStore", undefined);
                      } else {
                        field.onChange(newValue);
                      }
                    }}
                    defaultValue={field.value ?? "agentset"}
                    className="grid grid-cols-3 gap-4"
                  >
                    <RadioButton
                      value="agentset"
                      label="Agentset"
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

          {/* render other fields based on the provider dynamically */}
          {currentVectorProvider ? (
            currentVectorStoreOptions.map((key) => (
              <FormField
                key={key.name}
                control={form.control}
                name={
                  `vectorStore.${key.name}` as `vectorStore.${keyof z.infer<typeof VectorStoreSchema>}`
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
            ))
          ) : (
            <div className="flex flex-col gap-2">
              <Label data-slot="form-label">Vector Store</Label>

              <Select disabled value="default">
                <SelectTrigger className="w-xs">
                  <SelectValue placeholder="Select a vector store" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="default">{defaultVectorStore}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
