import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useCreateNamespace(orgSlug: string) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const mutation = useMutation(
    trpc.namespace.createNamespace.mutationOptions({
      onSuccess: (data) => {
        logEvent("namespace_created", {
          name: data.name,
          slug: data.slug,
          organizationId: data.organizationId,
          embeddingModel: data.embeddingConfig
            ? {
                provider: data.embeddingConfig.provider,
                model: data.embeddingConfig.model,
              }
            : null,
          vectorStore: data.vectorStoreConfig
            ? {
                provider: data.vectorStoreConfig.provider,
              }
            : null,
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  function invalidateNamespaces() {
    queryClient.invalidateQueries({
      queryKey: trpc.namespace.getOrgNamespaces.queryKey({
        slug: orgSlug,
      }),
    });
  }

  return {
    ...mutation,
    invalidateNamespaces,
  };
}
