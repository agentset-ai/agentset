"use client";

import { useNamespace } from "@/hooks/use-namespace";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Separator, Skeleton } from "@agentset/ui";

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
        }}
      />

      <Separator className="my-10" />

      <CustomDomainConfigurator defaultDomain={data.domain?.slug} />
    </div>
  );
}
