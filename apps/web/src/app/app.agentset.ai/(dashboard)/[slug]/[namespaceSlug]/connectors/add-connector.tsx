"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@agentset/ui/form";
import { DropboxIcon } from "@agentset/ui/icons/dropbox";
import { GoogleDriveIcon } from "@agentset/ui/icons/google-drive";
import { NotionIcon } from "@agentset/ui/icons/notion";
import { OneDriveIcon } from "@agentset/ui/icons/onedrive";
import { S3Icon } from "@agentset/ui/icons/s3";
import { RadioButton } from "@agentset/ui/radio-button";
import { RadioGroup } from "@agentset/ui/radio-group";
import { capitalize } from "@agentset/utils";

const formSchema = z.object({
  connectorProvider: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  accessKey: z.string(),
  secretKey: z.string(),
});

const connectorProviders = [
  { value: "s3", icon: S3Icon },
  { value: "google_drive", icon: GoogleDriveIcon },
  { value: "notion", icon: NotionIcon },
  { value: "dropbox", icon: DropboxIcon },
  { value: "onedrive", icon: OneDriveIcon },
];

export default function AddConnector() {
  const [selectedType, setSelectedType] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
  });

  // when the provider changes, set the model to the default model for the provider
  // const currentEmbeddingProvider = form.watch("connectorProvider")?.provider;

  // useEffect(() => {
  //   if (currentEmbeddingProvider) {
  //     const model = embeddingModels.find(
  //       (p) => p.value === currentEmbeddingProvider,
  //     )?.models[0];

  //     // reset other fields in the embeddingModel object
  //     form.resetField("embeddingModel", {
  //       defaultValue: {
  //         provider: currentEmbeddingProvider,
  //         model,
  //       } as z.infer<typeof EmbeddingConfigSchema>,
  //     });
  //   } else {
  //     form.setValue("embeddingModel", undefined);
  //   }
  //   // eslint-disable-next-line react-compiler/react-compiler
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [currentEmbeddingProvider]);

  // const currentEmbeddingOptions = useMemo(() => {
  //   const shape =
  //     EmbeddingConfigSchema.optionsMap.get(currentEmbeddingProvider)?.shape ??
  //     {};
  //   return {
  //     fields: Object.keys(shape).filter(
  //       (key) => key !== "provider" && key !== "model",
  //     ),
  //     shape,
  //   };
  // }, [currentEmbeddingProvider]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log(values);
  };

  return (
    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Connector
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Connector</DialogTitle>
          <DialogDescription>
            Configure a new connector to sync your documents.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="connectorProvider"
                render={({ field }) => (
                  <FormItem className="mt-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-4"
                      >
                        {connectorProviders.map((provider) => (
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

              {/* {currentEmbeddingProvider && (
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
          )} */}

              {/* render other fields based on the provider dynamically */}
              {/* {currentEmbeddingProvider ? (
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
                    openai:text-embedding-3-large
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )} */}
            </div>

            <DialogFooter className="mt-10 flex-row items-center justify-between sm:justify-between">
              <p className="text-muted-foreground text-xs">
                Can't find the connector you need?{" "}
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
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Connector</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>

        {/* <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Connector Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select a connector type" />
              </SelectTrigger>
              <SelectContent>
                {connectorTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType === "google_drive" && (
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input id="clientId" placeholder="Enter Google Drive Client ID" />
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="Enter Google Drive Client Secret"
              />
            </div>
          )}

          {selectedType === "s3" && (
            <div className="space-y-2">
              <Label htmlFor="accessKey">Access Key</Label>
              <Input id="accessKey" placeholder="Enter AWS Access Key" />
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="Enter AWS Secret Key"
              />
              <Label htmlFor="bucket">Bucket Name</Label>
              <Input id="bucket" placeholder="Enter S3 Bucket Name" />
              <Label htmlFor="region">Region</Label>
              <Input id="region" placeholder="Enter AWS Region" />
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button>Add Connector</Button>
          </DialogFooter>
        </div> */}
      </DialogContent>
    </Dialog>
  );
}
