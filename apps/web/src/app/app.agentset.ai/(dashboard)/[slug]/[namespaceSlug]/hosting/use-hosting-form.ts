import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { RouterOutputs, useTRPC } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import {
  DEFAULT_LLM,
  DEFAULT_RERANKER,
  llmSchema,
  rerankerSchema,
} from "@agentset/validation";

export const hostingFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  logo: z.string().nullable().optional(),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(200).optional(),
  ogImage: z.string().nullable().optional(),
  protected: z.boolean(),
  allowedEmails: z.array(z.email()),
  allowedEmailDomains: z.array(z.string()),
  systemPrompt: z.string().min(1, "System prompt cannot be empty"),
  exampleQuestions: z.array(z.string()).max(4),
  exampleSearchQueries: z.array(z.string()).max(4),
  welcomeMessage: z.string(),
  citationMetadataPath: z.string().optional(),
  searchEnabled: z.boolean(),
  rerankModel: rerankerSchema,
  llmModel: llmSchema,
  topK: z.number().int().min(1).max(100),
  rerankLimit: z.number().int().min(1).max(100),
});

export type HostingFormValues = z.infer<typeof hostingFormSchema>;

export type HostingData = NonNullable<RouterOutputs["hosting"]["get"]>;

export function useHostingForm(data: HostingData) {
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
        toast.success("Hosting settings saved");
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

  const form = useForm<HostingFormValues>({
    resolver: zodResolver(hostingFormSchema),
    defaultValues: {
      title: data.title || "",
      slug: data.slug || "",
      logo: data.logo || null,
      ogTitle: data.ogTitle || "",
      ogDescription: data.ogDescription || "",
      ogImage: data.ogImage || null,
      protected: data.protected,
      allowedEmails: data.allowedEmails,
      allowedEmailDomains: data.allowedEmailDomains,
      systemPrompt: data.systemPrompt || DEFAULT_SYSTEM_PROMPT.compile(),
      exampleQuestions:
        data.exampleQuestions.length === 0 ? [""] : data.exampleQuestions,
      exampleSearchQueries:
        data.exampleSearchQueries.length === 0
          ? [""]
          : data.exampleSearchQueries,
      welcomeMessage: data.welcomeMessage || "",
      citationMetadataPath: data.citationMetadataPath || "",
      searchEnabled: data.searchEnabled,
      rerankModel: data.rerankConfig?.model ?? DEFAULT_RERANKER,
      rerankLimit: data.rerankConfig?.limit ?? 15,
      llmModel: data.llmConfig?.model ?? DEFAULT_LLM,
      topK: data.topK,
    },
  });

  const onSubmit = async (newData: HostingFormValues) => {
    await updateHosting({
      namespaceId: namespace.id,
      title: newData.title,
      slug: newData.slug,
      logo: data?.logo === newData.logo ? undefined : newData.logo,
      ogTitle: newData.ogTitle,
      ogDescription: newData.ogDescription,
      ogImage: data?.ogImage === newData.ogImage ? undefined : newData.ogImage,
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

    // Reset form state to mark as clean after successful save
    form.reset(newData);
  };

  return {
    form,
    handleSubmit: form.handleSubmit(onSubmit),
    isUpdating,
    isDirty: form.formState.isDirty,
    reset: () => form.reset(),
  };
}
