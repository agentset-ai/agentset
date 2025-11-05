import ListInput from "@/components/list-input";
import { LLMSelector } from "@/components/llm-selector";
import { RerankerSelector } from "@/components/reranker-selector";
import SortableList from "@/components/sortable-list";
import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { APP_DOMAIN, HOSTING_PREFIX } from "@/lib/constants";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { RouterOutputs, useTRPC } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRightIcon, CopyIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import { AvatarUploader } from "@agentset/ui/avatar-uploader";
import { Button } from "@agentset/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";
import { Separator } from "@agentset/ui/separator";
import { Switch } from "@agentset/ui/switch";
import { Textarea } from "@agentset/ui/textarea";
import {
  DEFAULT_LLM,
  DEFAULT_RERANKER,
  llmSchema,
  rerankerSchema,
} from "@agentset/validation";

export const schema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  logo: z.string().nullable().optional(),
  protected: z.boolean(),
  allowedEmails: z.array(z.string().email()),
  allowedEmailDomains: z.array(z.string()),
  systemPrompt: z.string().min(1, "System prompt cannot be empty"),
  exampleQuestions: z
    .array(z.string().min(1, "Example cannot be empty"))
    .max(4),
  exampleSearchQueries: z
    .array(z.string().min(1, "Example cannot be empty"))
    .max(4),
  welcomeMessage: z.string(),
  citationMetadataPath: z.string().optional(),
  searchEnabled: z.boolean(),
  rerankModel: rerankerSchema,
  llmModel: llmSchema,
  topK: z.number().int().min(1).max(100),
  rerankLimit: z.number().int().min(1).max(100),
});

type FormValues = z.infer<typeof schema>;

type Data = NonNullable<RouterOutputs["hosting"]["get"]>;

export default function HostingForm({ data }: { data: Data }) {
  const namespace = useNamespace();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { mutateAsync: updateHosting, isPending: isUpdating } = useMutation(
    trpc.hosting.update.mutationOptions({
      onSuccess: (result) => {
        logEvent("hosting_updated", {
          namespaceId: namespace.id,
          slug: result.slug,
          protected: result.protected,
          searchEnabled: result.searchEnabled,
          hasCustomPrompt: !!result.systemPrompt,
          hasWelcomeMessage: !!result.welcomeMessage,
          exampleQuestionsCount: result.exampleQuestions?.length || 0,
          exampleSearchQueriesCount: result.exampleSearchQueries?.length || 0,
        });
        toast.success("Hosting updated");
        queryClient.setQueryData(
          trpc.hosting.get.queryKey({
            namespaceId: namespace.id,
          }),
          (old) => {
            return {
              ...(old ?? {}),
              ...result,
              domain: old?.domain || null,
            };
          },
        );

        queryClient.invalidateQueries(
          trpc.hosting.get.queryOptions({
            namespaceId: namespace.id,
          }),
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: data.title || "",
      slug: data.slug || "",
      logo: data.logo || null,
      protected: data.protected,
      allowedEmails: data.allowedEmails,
      allowedEmailDomains: data.allowedEmailDomains,
      systemPrompt: data.systemPrompt || DEFAULT_SYSTEM_PROMPT.compile(),
      exampleQuestions: data.exampleQuestions,
      exampleSearchQueries: data.exampleSearchQueries,
      welcomeMessage: data.welcomeMessage || "",
      citationMetadataPath: data.citationMetadataPath || "",
      searchEnabled: data.searchEnabled,
      rerankModel: data.rerankConfig?.model ?? DEFAULT_RERANKER,
      rerankLimit: data.rerankConfig?.limit ?? 15,
      llmModel: data.llmConfig?.model ?? DEFAULT_LLM,
      topK: data.topK,
    },
  });

  const handleSubmit = async (newData: FormValues) => {
    updateHosting({
      namespaceId: namespace.id,
      title: newData.title,
      slug: newData.slug,
      logo: data?.logo === newData.logo ? undefined : newData.logo,
      protected: newData.protected,
      allowedEmails: newData.allowedEmails,
      allowedEmailDomains: newData.allowedEmailDomains,
      systemPrompt: newData.systemPrompt,
      exampleQuestions: newData.exampleQuestions,
      exampleSearchQueries: newData.exampleSearchQueries,
      welcomeMessage: newData.welcomeMessage,
      citationMetadataPath: newData.citationMetadataPath,
      searchEnabled: newData.searchEnabled,
      rerankModel: newData.rerankModel,
      llmModel: newData.llmModel,
      topK: newData.topK,
      rerankLimit: newData.rerankLimit,
    });
  };

  const url = `${APP_DOMAIN}${HOSTING_PREFIX}${data?.slug}`;

  const handleCopy = () => {
    void navigator.clipboard.writeText(url);
    toast.success("Copied to clipboard");
  };

  return (
    <div>
      <div className="mb-20 flex w-full items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-medium">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-full w-full rounded-full bg-green-500" />
            </span>{" "}
            Your deployment is live!
          </h3>
          <a
            href={url}
            target="_blank"
            className="text-muted-foreground mt-2 text-sm underline"
          >
            {url.replace("https://", "").replace("http://", "")}
          </a>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <CopyIcon className="size-4" /> Copy
          </Button>
          <Button size="sm" asChild>
            <a href={url} target="_blank">
              <ArrowUpRightIcon className="size-4" /> Visit
            </a>
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form
          className="flex flex-col gap-20"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-medium">Hosting Details</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Configure the basic information for your hosting
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col gap-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter a title for your hosting..."
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter a unique slug..." />
                    </FormControl>
                    <FormDescription>
                      Preview: {APP_DOMAIN}
                      {HOSTING_PREFIX}
                      {field.value}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo</FormLabel>

                    <AvatarUploader
                      onImageChange={field.onChange}
                      defaultImageUrl={data?.logo}
                    />

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div>
            <div>
              <h2 className="text-xl font-medium">Protection</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Only allow certain people to access your hosting
              </p>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col gap-8">
              <FormField
                control={form.control}
                name="protected"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel>Enabled</FormLabel>

                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("protected") && (
                <>
                  <ListInput
                    form={form}
                    name="allowedEmails"
                    label="Allowed Emails"
                    description="Only these emails will be allowed access (if set)."
                    placeholder="Enter an email address..."
                  />

                  <ListInput
                    form={form}
                    name="allowedEmailDomains"
                    label="Allowed Email Domains"
                    description="Only these email domains will be allowed access (if set)."
                    placeholder="Enter a domain (e.g. example.com)..."
                  />
                </>
              )}
            </div>
          </div>

          <div>
            <div>
              <h2 className="text-xl font-medium">Chat Settings</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Customize the chat settings for your hosting
              </p>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col gap-8">
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

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rerankModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Re-ranker Model</FormLabel>
                    <FormControl>
                      <RerankerSelector
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        className="max-w-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Number of documents to retrieve from vector store (1-100)
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
                    <FormLabel>Re-rank Limit</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={1}
                        max={100}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                        className="max-w-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Number of documents after reranking (1-100)
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
                        className="h-32 max-h-56"
                        placeholder="Enter your system prompt..."
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="welcomeMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Welcome Message</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="h-32 max-h-56"
                        placeholder="Enter a welcome message that will be shown to users when they first interact with your AI assistant..."
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="citationMetadataPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Citation Metadata Path</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. title or foo.bar"
                        className="max-w-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional path to use for citation names. For example, if
                      your metadata has a "title" field, enter "title". For
                      nested fields, use dot notation like "foo.bar".
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SortableList
                form={form}
                name="exampleQuestions"
                label="Examples"
                maxItems={4}
              />
            </div>
          </div>

          <div>
            <div>
              <h2 className="text-xl font-medium">Search Settings</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Customize the search settings for your hosting
              </p>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col gap-8">
              <FormField
                control={form.control}
                name="searchEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3">
                    <div>
                      <FormLabel>Enable Search</FormLabel>
                      <FormDescription>
                        Allow users to search through your documents
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("searchEnabled") && (
                <SortableList
                  form={form}
                  name="exampleSearchQueries"
                  label="Examples"
                  maxItems={4}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isUpdating}>
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
