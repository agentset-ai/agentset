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
  /** Number of existing namespaces - used to generate default name */
  namespaceCount?: number;
  /** User's name for default namespace naming */
  userName?: string;
  /** Override default name (e.g., from input field) */
  defaultName?: string;
}

export default function CreateNamespaceDialog({
  organization,
  open,
  setOpen,
  namespaceCount = 0,
  userName = "User",
  defaultName: defaultNameProp,
}: CreateNamespaceDialogProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const namespaceMutation = useCreateNamespace();

  const [step, setStep] = useState<Step>("recommended");
  const [isComplete, setIsComplete] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig>(
    MANAGED_EMBEDDING_CONFIG,
  );
  const [vectorStoreConfig, setVectorStoreConfig] =
    useState<CreateVectorStoreConfig>(MANAGED_VECTOR_STORE_CONFIG);

  // Generate default name based on user and namespace count, or use provided default
  const defaultName = useMemo(() => {
    if (defaultNameProp) {
      return defaultNameProp;
    }
    if (namespaceCount === 0) {
      return `${userName}'s Namespace`;
    }
    return `${userName}'s Namespace ${namespaceCount + 1}`;
  }, [userName, namespaceCount, defaultNameProp]);

  const defaultSlug = useMemo(() => toSlug(defaultName), [defaultName]);

  // Reset state when dialog opens
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

  // Navigate to namespace after creation
  const navigateToNamespace = useCallback(
    (namespaceSlug: string) => {
      router.push(`/${organization.slug}/${namespaceSlug}/quick-start`);
    },
    [router, organization.slug],
  );

  // Create namespace
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

          // Redirect after short delay
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

  // Step handlers
  const handleRecommendedContinue = useCallback(
    (newName: string, newSlug: string) => {
      setName(newName);
      setSlug(newSlug);
      // Use recommended config, go to ingest step
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

  // Dialog title and description based on step
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

  // Dynamic dialog size
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
        // Don't allow closing while creating
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

// Re-export for backward compatibility
export { CreateNamespaceDialog };
