"use client";

import { useCallback, useState } from "react";
import { useCreateNamespace } from "@/hooks/use-create-namespace";
import { useRouter } from "@bprogress/next/app";
import { AnimatePresence } from "motion/react";

import type {
  CreateVectorStoreConfig,
  EmbeddingConfig,
} from "@agentset/validation";
import { capitalize, toSlug } from "@agentset/utils";

import type { SampleDataType } from "./constants";
import {
  MANAGED_EMBEDDING_CONFIG,
  MANAGED_VECTOR_STORE_CONFIG,
} from "./constants";
import { CreateNamespaceForm } from "./create-namespace-form";
import { CreatingNamespaceState } from "./creating-namespace-state";
import { NamespaceConfigStep } from "./namespace-config-step";

type Step = "form" | "config" | "creating";

interface CreateFirstNamespaceProps {
  organization: {
    id: string;
    slug: string;
    name: string;
  };
  onOpenDialog?: (name: string) => void;
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
  const [_selectedSampleType, setSelectedSampleType] =
    useState<SampleDataType | null>(null);

  const userName = capitalize(userNameProp ?? "User")!;

  const defaultName = `${userName}'s Namespace`;

  const navigateToNamespace = useCallback(
    (namespaceSlug: string) => {
      router.push(`/${organization.slug}/${namespaceSlug}/quick-start`);
    },
    [router, organization.slug],
  );

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
            setTimeout(() => {
              navigateToNamespace(data.slug);
            }, 1500);
          },
        },
      );
    },
    [namespaceMutation, organization.id, navigateToNamespace],
  );

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

  const handleSelectSampleData = useCallback(
    (type: SampleDataType) => {
      setSelectedSampleType(type);
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
