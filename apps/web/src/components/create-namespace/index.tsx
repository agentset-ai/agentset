"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { IngestStep } from "./ingest-step";
import { RecommendedStep } from "./recommended-step";

// Managed config defaults
const MANAGED_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: "MANAGED_OPENAI",
  model: "text-embedding-3-large",
};

const MANAGED_VECTOR_STORE_CONFIG: CreateVectorStoreConfig = {
  provider: "MANAGED_TURBOPUFFER",
};

type Step = "recommended" | "customize" | "ingest" | "creating";

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
  const namespaceMutation = useCreateNamespace();

  const [step, setStep] = useState<Step>("recommended");
  const [isComplete, setIsComplete] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig>(
    MANAGED_EMBEDDING_CONFIG,
  );
  const [vectorStoreConfig, setVectorStoreConfig] =
    useState<CreateVectorStoreConfig>(MANAGED_VECTOR_STORE_CONFIG);

  const defaultSlug = useMemo(() => toSlug(defaultName), [defaultName]);

  useEffect(() => {
    if (open) {
      setStep("recommended");
      setIsComplete(false);
      setName(defaultName);
      setSlug(defaultSlug);
      setEmbeddingConfig(MANAGED_EMBEDDING_CONFIG);
      setVectorStoreConfig(MANAGED_VECTOR_STORE_CONFIG);
    }
  }, [open, defaultName, defaultSlug]);

  const navigateToNamespace = useCallback(
    (namespaceSlug: string) => {
      router.push(`/${organization.slug}/${namespaceSlug}/quick-start`);
    },
    [router, organization.slug],
  );

  const createNamespace = useCallback(() => {
    namespaceMutation.mutate(
      {
        name,
        slug,
        orgId: organization.id,
        embeddingConfig,
        vectorStoreConfig,
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
            navigateToNamespace(data.slug);
          }, 1500);
        },
      },
    );
  }, [
    name,
    slug,
    organization.id,
    organization.slug,
    embeddingConfig,
    vectorStoreConfig,
    namespaceMutation,
    queryClient,
    trpc,
    setOpen,
    navigateToNamespace,
  ]);

  const handleRecommendedContinue = useCallback(
    (newName: string, newSlug: string) => {
      setName(newName);
      setSlug(newSlug);
      setEmbeddingConfig(MANAGED_EMBEDDING_CONFIG);
      setVectorStoreConfig(MANAGED_VECTOR_STORE_CONFIG);
      setStep("ingest");
    },
    [],
  );

  const handleRecommendedCustomize = useCallback(
    (newName: string, newSlug: string) => {
      setName(newName);
      setSlug(newSlug);
      setStep("customize");
    },
    [],
  );

  const handleCustomizeSubmit = useCallback(
    (config: {
      embeddingConfig: EmbeddingConfig;
      vectorStoreConfig: CreateVectorStoreConfig;
    }) => {
      setEmbeddingConfig(config.embeddingConfig);
      setVectorStoreConfig(config.vectorStoreConfig);
      setStep("ingest");
    },
    [],
  );

  const handleCustomizeBack = useCallback(() => {
    setStep("recommended");
  }, []);

  const handleIngestSubmit = useCallback(
    (_files: File[]) => {
      // TODO: Handle file upload in the future
      // For now, just create the namespace
      setStep("creating");
      createNamespace();
    },
    [createNamespace],
  );

  const handleIngestSkip = useCallback(() => {
    setStep("creating");
    createNamespace();
  }, [createNamespace]);

  const handleIngestBack = useCallback(() => {
    setStep("customize");
  }, []);

  const getDialogContent = () => {
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
      case "ingest":
        return {
          title: "Upload files",
          description:
            "Optionally upload documents to populate your namespace.",
        };
      case "creating":
        return {
          title: "Creating namespace",
          description: "Please wait while we set up your namespace.",
        };
    }
  };

  const dialogContent = getDialogContent();

  const getDialogSize = () => {
    switch (step) {
      case "ingest":
        return "sm:max-w-2xl";
      case "creating":
        return "sm:max-w-md";
      default:
        return "sm:max-w-xl";
    }
  };

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

        {step === "ingest" && (
          <IngestStep
            onSubmit={handleIngestSubmit}
            onSkip={handleIngestSkip}
            onBack={handleIngestBack}
          />
        )}

        {step === "creating" && (
          <CreatingStep namespaceName={name} isComplete={isComplete} />
        )}
      </DialogContent>
    </Dialog>
  );
}

