"use client";

import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Separator } from "@agentset/ui/separator";
import { Skeleton } from "@agentset/ui/skeleton";

import { CustomDomainConfigurator } from "./domain-card";
import { EmptyState } from "./empty-state";
import HostingForm from "./form";

export default function HostingPage() {
  const namespace = useNamespace();

  const trpc = useTRPC();

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    trpc.hosting.get.queryOptions({
      namespaceId: namespace.id,
    }),
  );

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

  if (isLoading) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
      </div>
    );
  }

  if (!data) {
    return <EmptyState />;
  }

  return (
    <div className="max-w-xl">
      <HostingForm
        isPending={isUpdating}
        onSubmit={async (data) => {
          await updateHosting({
            namespaceId: namespace.id,
            ...data,
          });
        }}
        defaultValues={{
          title: data.title || "",
          slug: data.slug || "",
          logo: data.logo || null,
          protected: data.protected,
          allowedEmails: data.allowedEmails,
          allowedEmailDomains: data.allowedEmailDomains,
          systemPrompt: data.systemPrompt || "",
          examplesQuestions: data.exampleQuestions,
          exampleSearchQueries: data.exampleSearchQueries,
          welcomeMessage: data.welcomeMessage || "",
          citationMetadataPath: data.citationMetadataPath || "",
          searchEnabled: data.searchEnabled,
          rerankConfig: data.rerankConfig,
          llmConfig: data.llmConfig,
        }}
      />

      <Separator className="my-10" />

      <CustomDomainConfigurator defaultDomain={data.domain?.slug} />
    </div>
  );
}
