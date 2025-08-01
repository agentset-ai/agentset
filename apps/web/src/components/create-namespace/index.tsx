"use client";

import { useEffect, useMemo, useState } from "react";
import { toSlug } from "@/lib/slug";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { EmbeddingConfig, VectorStoreConfig } from "@agentset/validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@agentset/ui";

import CreateNamespaceDetailsStep from "./details-step";
import CreateNamespaceEmbeddingStep from "./embedding-step";
import CreateNamespaceVectorStoreStep from "./vector-store-step";

export default function CreateNamespaceDialog({
  organization,
  open,
  setOpen,
}: {
  organization?: { id: string; slug: string; name: string } | null;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"details" | "embeddings" | "vector-store">(
    "details",
  );

  const defaultName = useMemo(() => {
    return organization?.name
      ? `${organization.name}'s First Namespace`
      : "Default";
  }, [organization]);
  const defaultSlug = useMemo(() => toSlug(defaultName), [defaultName]);

  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(defaultSlug);

  useEffect(() => {
    setName(defaultName);
    setSlug(toSlug(defaultName));
  }, [defaultName]);

  const [embeddingModel, setEmbeddingModel] = useState<
    EmbeddingConfig | undefined
  >(undefined);

  const { isPending, mutateAsync: createNamespace } = useMutation(
    trpc.namespace.createNamespace.mutationOptions({
      onSuccess: (data) => {
        toast.success("Namespace created");
        setOpen(false);

        setName(defaultName);
        setSlug(defaultSlug);

        setEmbeddingModel(undefined);
        setStep("details");

        if (organization) {
          const queryKey = trpc.namespace.getOrgNamespaces.queryKey({
            orgId: organization.id,
          });
          queryClient.setQueryData(queryKey, (old) => [data, ...(old ?? [])]);
          void queryClient.invalidateQueries({ queryKey });
          router.push(`/${organization.slug}/${data.slug}/quick-start`);
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const onSubmit = async (vectorStore?: VectorStoreConfig) => {
    if (!organization) return;

    await createNamespace({
      orgId: organization.id,
      name: name,
      slug: slug,
      embeddingConfig: embeddingModel,
      vectorStoreConfig: vectorStore,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (isPending) return;
        setOpen(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === "details"
              ? "Create namespace"
              : step === "embeddings"
                ? "Embeddings"
                : "Vector store"}
          </DialogTitle>
          <DialogDescription>
            {step === "details"
              ? "Create a new namespace to start ingesting data."
              : step === "embeddings"
                ? "Choose an embedding model for your namespace. Note that you can't change the embedding model once the namespace is created."
                : "Choose a vector store for your namespace. Note that you can't change the vector store once the namespace is created."}
          </DialogDescription>
        </DialogHeader>

        {step === "details" ? (
          <CreateNamespaceDetailsStep
            defaultValues={{
              name,
              slug,
            }}
            onSubmit={(values) => {
              setName(values.name);
              setSlug(values.slug);
              setStep("embeddings");
            }}
          />
        ) : step === "embeddings" ? (
          <CreateNamespaceEmbeddingStep
            defaultValues={embeddingModel ? { embeddingModel } : undefined}
            onSubmit={(values) => {
              setEmbeddingModel(values.embeddingModel ?? undefined);
              setStep("vector-store");
            }}
            onBack={() => setStep("details")}
          />
        ) : (
          <CreateNamespaceVectorStoreStep
            isLoading={isPending}
            onSubmit={(values) => onSubmit(values.vectorStore)}
            onBack={() => setStep("embeddings")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
