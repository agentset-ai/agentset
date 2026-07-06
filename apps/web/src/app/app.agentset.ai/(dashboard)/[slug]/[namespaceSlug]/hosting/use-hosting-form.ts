import type { RouterOutputs } from "@/lib/orpc";
import { useNamespace } from "@/hooks/use-namespace";
import { useOrganization } from "@/hooks/use-organization";
import {
  AGENTIC_SYSTEM_PROMPT,
  isKnownDefaultPrompt,
} from "@/lib/agentic-search/prompts";
import { logEvent } from "@/lib/analytics";
import { orpc } from "@/lib/orpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import { llmSchema, rerankerSchema } from "@agentset/validation";

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

export type HostingData = RouterOutputs["hosting"]["get"]["data"];

export function useHostingForm(data: HostingData) {
  const namespace = useNamespace();
  const organization = useOrganization();
  const queryClient = useQueryClient();

  const { mutateAsync: updateHosting, isPending: isUpdating } = useMutation(
    orpc.hosting.update.mutationOptions({
      context: { orgId: organization.id },
      onSuccess: (result) => {
        logEvent("hosting_updated", {
          namespaceId: namespace.id,
          slug: result.data.slug,
          protected: result.data.protected,
          searchEnabled: result.data.searchEnabled,
          hasCustomPrompt: !!result.data.systemPrompt,
          hasWelcomeMessage: !!result.data.welcomeMessage,
          exampleQuestionsCount: result.data.exampleQuestions.length,
          exampleSearchQueriesCount: result.data.exampleSearchQueries.length,
        });
        toast.success("Hosting settings saved");
        queryClient.setQueryData(
          orpc.hosting.get.queryKey({
            input: { namespaceId: namespace.id },
          }),
          (old) => {
            // the hosting.get cache holds the enveloped shape
            return {
              success: true as const,
              data: {
                ...old?.data,
                ...result.data,
                domain: old?.data.domain ?? null,
              },
            };
          },
        );

        queryClient.invalidateQueries({
          queryKey: orpc.hosting.get.key({
            input: { namespaceId: namespace.id },
          }),
        });
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
      // default-shaped stored prompts (null, or a pinned copy of an old
      // default) display the prompt that actually runs, not the stale snapshot
      systemPrompt: isKnownDefaultPrompt(data.systemPrompt)
        ? AGENTIC_SYSTEM_PROMPT
        : data.systemPrompt!,
      exampleQuestions:
        data.exampleQuestions.length === 0 ? [""] : data.exampleQuestions,
      exampleSearchQueries:
        data.exampleSearchQueries.length === 0
          ? [""]
          : data.exampleSearchQueries,
      welcomeMessage: data.welcomeMessage || "",
      citationMetadataPath: data.citationMetadataPath || "",
      searchEnabled: data.searchEnabled,
      // the shared hosting.get output applies the model defaults server-side
      rerankModel: data.rerankConfig.model,
      rerankLimit: data.rerankConfig.limit,
      llmModel: data.llmConfig.model,
      topK: data.topK,
    },
  });

  const onSubmit = async (newData: HostingFormValues) => {
    await updateHosting({
      namespaceId: namespace.id,
      title: newData.title,
      slug: newData.slug,
      logo: data.logo === newData.logo ? undefined : newData.logo,
      ogTitle: newData.ogTitle,
      ogDescription: newData.ogDescription,
      ogImage: data.ogImage === newData.ogImage ? undefined : newData.ogImage,
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
