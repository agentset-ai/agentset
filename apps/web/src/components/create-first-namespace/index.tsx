"use client";

import { useCallback, useState } from "react";
import { useCreateNamespace } from "@/hooks/use-create-namespace";
import { useRouter } from "@bprogress/next/app";
import { AnimatePresence } from "motion/react";

import type {
  CreateVectorStoreConfig,
  EmbeddingConfig,
} from "@agentset/validation";
import { toSlug } from "@agentset/utils";

import type { SampleDataType } from "./constants";
import {
  MANAGED_EMBEDDING_CONFIG,
  MANAGED_VECTOR_STORE_CONFIG,
} from "./constants";
import { CreateNamespaceForm } from "./create-namespace-form";
import { CreatingNamespaceState } from "./creating-namespace-state";
import { NamespaceConfigStep } from "./namespace-config-step";

type Step = "form" | "config" | "creating";

// Helper to capitalize first letter of each word
function capitalizeFirstLetter(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface CreateFirstNamespaceProps {
  organization: {
    id: string;
    slug: string;
    name: string;
  };
  /** Callback to open the dialog instead of inline config */
  onOpenDialog?: (name: string) => void;
  /** User's name for namespace naming */
  userName?: string;
}

export function CreateFirstNamespace({
  organization,
  onOpenDialog,
  userName: userNameProp,
}: CreateFirstNamespaceProps) {
  const router = useRouter();
  const namespaceMutation = useCreateNamespace();

  const [step, setStep] = useState<Step>("form");
  const [isComplete, setIsComplete] = useState(false);
  const [namespaceName, setNamespaceName] = useState("");
  // Track selected sample type for future use when ingesting sample data
  const [_selectedSampleType, setSelectedSampleType] =
    useState<SampleDataType | null>(null);

  // Use provided userName or default, with first letter capitalized
  const userName = capitalizeFirstLetter(userNameProp ?? "User");

  // Default namespace name with capitalized user name
  const defaultName = `${userName}'s Namespace`;

  // Navigate to namespace quick-start page
  const navigateToNamespace = useCallback(
    (namespaceSlug: string) => {
      router.push(`/${organization.slug}/${namespaceSlug}/quick-start`);
    },
    [router, organization.slug],
  );

  // Create namespace with given config
  const createNamespace = useCallback(
    (
      name: string,
      config: {
        embeddingConfig?: EmbeddingConfig;
        vectorStoreConfig?: CreateVectorStoreConfig;
      },
    ) => {
      const slug = toSlug(name);

      namespaceMutation.mutate(
        {
          name,
          slug,
          orgId: organization.id,
          embeddingConfig: config.embeddingConfig,
          vectorStoreConfig: config.vectorStoreConfig,
        },
        {
          onSuccess: (data) => {
            setIsComplete(true);
            // Small delay to show success state before redirect
            setTimeout(() => {
              navigateToNamespace(data.slug);
            }, 1500);
          },
        },
      );
    },
    [namespaceMutation, organization.id, navigateToNamespace],
  );

  // Handle "Create Namespace" button click with name from input
  const handleCreateNamespace = useCallback(
    (name: string) => {
      setNamespaceName(name);
      if (onOpenDialog) {
        onOpenDialog(name);
      } else {
        setStep("config");
      }
    },
    [onOpenDialog],
  );

  // Handle sample data card click - create namespace with managed config
  const handleSelectSampleData = useCallback(
    (type: SampleDataType) => {
      setSelectedSampleType(type);
      // Use default name for sample data
      const name = defaultName;
      setNamespaceName(name);
      setStep("creating");

      // TODO: Ingest sample data based on selected type after namespace creation

      createNamespace(name, {
        embeddingConfig: MANAGED_EMBEDDING_CONFIG,
        vectorStoreConfig: MANAGED_VECTOR_STORE_CONFIG,
      });
    },
    [createNamespace, defaultName],
  );

  // Handle config step submission
  const handleConfigSubmit = useCallback(
    (config: {
      embeddingConfig?: EmbeddingConfig;
      vectorStoreConfig?: CreateVectorStoreConfig;
    }) => {
      setStep("creating");
      createNamespace(namespaceName, config);
    },
    [createNamespace, namespaceName],
  );

  // Handle back from config step
  const handleBackFromConfig = useCallback(() => {
    setStep("form");
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <AnimatePresence mode="wait">
        {step === "form" && (
          <CreateNamespaceForm
            key="form"
            defaultName={defaultName}
            onCreateNamespace={handleCreateNamespace}
            onSelectSampleData={handleSelectSampleData}
          />
        )}
        {step === "config" && (
          <NamespaceConfigStep
            key="config"
            onSubmit={handleConfigSubmit}
            onBack={handleBackFromConfig}
            isLoading={namespaceMutation.isPending}
          />
        )}
        {step === "creating" && (
          <CreatingNamespaceState
            key="creating"
            namespaceName={namespaceName}
            isComplete={isComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
