"use client";

import { useEffect, useState } from "react";
import { useCreateNamespace } from "@/hooks/use-create-namespace";
import { useRouter } from "@bprogress/next/app";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  CreateVectorStoreConfig,
  EmbeddingConfig,
} from "@agentset/validation";
import { cn } from "@agentset/ui/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@agentset/ui/dialog";
import { toSlug } from "@agentset/utils";

import { useTRPC } from "../../trpc/react";
import { CreatingStep } from "./creating-step";
import { CustomizeStep } from "./customize-step";
import { RecommendedStep } from "./recommended-step";

const MANAGED_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: "MANAGED_OPENAI",
  model: "text-embedding-3-large",
};

const MANAGED_VECTOR_STORE_CONFIG: CreateVectorStoreConfig = {
  provider: "MANAGED_TURBOPUFFER",
};

type Step = "recommended" | "customize" | "creating";

interface CreateNamespaceDialogProps {
  organization: {
    id: string;
    slug: string;
    name: string;
  };
  open: boolean;
  setOpen: (open: boolean) => void;
  defaultName: string;
}

export default function CreateNamespaceDialog({
  organization,
  open,
  setOpen,
  defaultName,
}: CreateNamespaceDialogProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const namespaceMutation = useCreateNamespace(organization.slug);

  const [step, setStep] = useState<Step>("recommended");
  const [isComplete, setIsComplete] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const defaultSlug = toSlug(defaultName);

  useEffect(() => {
    if (open) {
      setStep("recommended");
      setIsComplete(false);
      setName(defaultName);
      setSlug(defaultSlug);
    }
  }, [open, defaultName, defaultSlug]);

  function createNamespace(params: {
    name: string;
    slug: string;
    embeddingConfig: EmbeddingConfig;
    vectorStoreConfig: CreateVectorStoreConfig;
  }) {
    namespaceMutation.mutate(
      {
        name: params.name,
        slug: params.slug,
        orgId: organization.id,
        embeddingConfig: params.embeddingConfig,
        vectorStoreConfig: params.vectorStoreConfig,
      },
      {
        onSuccess: (data) => {
          // Invalidate namespace list
          const queryKey = trpc.namespace.getOrgNamespaces.queryKey({
            slug: organization.slug,
          });
          queryClient.setQueryData(queryKey, (old) => [data, ...(old ?? [])]);
          void queryClient.invalidateQueries({ queryKey });

          toast.success("Namespace created");
          setIsComplete(true);

          setTimeout(() => {
            setOpen(false);
            router.push(`/${organization.slug}/${data.slug}/quick-start`);
          }, 1500);
        },
      },
    );
  }
  function handleRecommendedContinue(newName: string, newSlug: string) {
    setName(newName);
    setSlug(newSlug);
    setStep("creating");
    createNamespace({
      name: newName,
      slug: newSlug,
      embeddingConfig: MANAGED_EMBEDDING_CONFIG,
      vectorStoreConfig: MANAGED_VECTOR_STORE_CONFIG,
    });
  }

  function handleRecommendedCustomize(newName: string, newSlug: string) {
    setName(newName);
    setSlug(newSlug);
    setStep("customize");
  }

  function handleCustomizeSubmit(config: {
    embeddingConfig: EmbeddingConfig;
    vectorStoreConfig: CreateVectorStoreConfig;
  }) {
    setStep("creating");
    createNamespace({
      name,
      slug,
      embeddingConfig: config.embeddingConfig,
      vectorStoreConfig: config.vectorStoreConfig,
    });
  }

  function handleCustomizeBack() {
    return setStep("recommended");
  }

  function getDialogContent() {
    switch (step) {
      case "recommended":
        return {
          title: "Create namespace",
          description:
            "Create a new namespace to start ingesting and querying your data.",
        };
      case "customize":
        return {
          title: "Configure namespace",
          description:
            "Choose your embedding model and vector store. These settings cannot be changed later.",
        };
      case "creating":
        return {
          title: "Creating namespace",
          description: "Please wait while we set up your namespace.",
        };
    }
  }

  function getDialogSize() {
    switch (step) {
      case "creating":
        return "sm:max-w-md";
      case "customize":
        return "sm:max-w-4xl";
      default:
        return "sm:max-w-xl";
    }
  }

  const dialogContent = getDialogContent();
  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (namespaceMutation.isPending || step === "creating") return;
        setOpen(newOpen);
      }}
    >
      <DialogContent
        className={cn("transition-all duration-200", getDialogSize())}
        scrollableOverlay
      >
        <DialogHeader>
          <DialogTitle>{dialogContent.title}</DialogTitle>
          <DialogDescription>{dialogContent.description}</DialogDescription>
        </DialogHeader>

        {step === "recommended" && (
          <RecommendedStep
            orgId={organization.id}
            defaultName={name}
            defaultSlug={slug}
            onContinue={handleRecommendedContinue}
            onCustomize={handleRecommendedCustomize}
          />
        )}

        {step === "customize" && (
          <CustomizeStep
            onSubmit={handleCustomizeSubmit}
            onBack={handleCustomizeBack}
          />
        )}

        {step === "creating" && (
          <CreatingStep namespaceName={name} isComplete={isComplete} />
        )}
      </DialogContent>
    </Dialog>
  );
}
