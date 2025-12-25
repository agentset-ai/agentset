"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@bprogress/next/app";
import { Building2Icon, CheckCircleIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type {
  CreateVectorStoreConfig,
  EmbeddingConfig,
} from "@agentset/validation";
import { Card } from "@agentset/ui/card";
import { Spinner } from "@agentset/ui/spinner";
import { capitalize, toSlug } from "@agentset/utils";

import type { SampleDataType as SampleDataTypeEnum } from "./_constants";
import type { OnboardingData } from "./page";
import { CreatingNamespace } from "./_components/creating-namespace";
import { DataSourceChoice } from "./_components/data-source-choice";
import { NamespaceConfig } from "./_components/namespace-config";
import { SampleDataType } from "./_components/sample-data-type";
import {
  MANAGED_EMBEDDING_CONFIG,
  MANAGED_VECTOR_STORE_CONFIG,
} from "./_constants";
import { useFreshNamespace } from "./_hooks/use-fresh-namespace";
import { useFreshOrganization } from "./_hooks/use-fresh-organization";

type OnboardingState =
  | "creating-org"
  | "data-source-choice"
  | "namespace-config"
  | "sample-data-type"
  | "creating-namespace"
  | "exists"
  | "finished";

interface OrganizationInfo {
  id: string;
  slug: string;
  name: string;
}

interface NamespaceInfo {
  id: string;
  slug: string;
}

export function OnboardingClientPage(props: {
  onboardingData: OnboardingData;
  userName: string;
}) {
  const router = useRouter();
  const orgMutation = useFreshOrganization();
  const namespaceMutation = useFreshNamespace();

  const { onboardingData, userName } = props;
  const [state, setState] = useState<OnboardingState>("creating-org");
  const [organization, setOrganization] = useState<OrganizationInfo | null>(
    null,
  );
  const [namespace, setNamespace] = useState<NamespaceInfo | null>(null);
  const [selectedSampleType, setSelectedSampleType] =
    useState<SampleDataTypeEnum | null>(null);

  // Auto-generated namespace name based on user's name
  const getNamespaceName = useCallback(() => {
    return `${capitalize(userName)}'s Namespace`;
  }, [userName]);

  const getNamespaceSlug = useCallback(() => {
    return toSlug(getNamespaceName());
  }, [getNamespaceName]);

  // Navigate to namespace quick-start page
  const navigateToNamespace = useCallback(
    (org: OrganizationInfo, ns: NamespaceInfo) => {
      router.push(`/${org.slug}/${ns.slug}/quick-start`);
    },
    [router],
  );

  // Create namespace with given config
  const createNamespace = useCallback(
    (
      org: OrganizationInfo,
      config: {
        embeddingConfig?: EmbeddingConfig;
        vectorStoreConfig?: CreateVectorStoreConfig;
      },
    ) => {
      const name = getNamespaceName();
      const slug = getNamespaceSlug();

      namespaceMutation.mutate(
        {
          name,
          slug,
          orgId: org.id,
          embeddingConfig: config.embeddingConfig,
          vectorStoreConfig: config.vectorStoreConfig,
        },
        {
          onSuccess: (data) => {
            setNamespace({ id: data.id, slug: data.slug });
          },
        },
      );
    },
    [getNamespaceName, getNamespaceSlug, namespaceMutation],
  );

  // Handle organization creation on mount
  useEffect(() => {
    // If organization already exists, show "exists" state
    if (onboardingData.org) {
      setState("exists");
      return;
    }

    // Start creating organization if it doesn't exist
    if (!orgMutation.isPending && !orgMutation.isSuccess) {
      const name = `${capitalize(userName)}'s Organization`;
      orgMutation.mutate(
        { name },
        {
          onSuccess: (data) => {
            setOrganization({
              id: data.id,
              slug: data.slug,
              name: data.name,
            });
            setState("data-source-choice");
          },
        },
      );
    }
  }, [onboardingData, userName, orgMutation.isPending, orgMutation.isSuccess]);

  // Handle state transitions based on mutations
  useEffect(() => {
    // Handle namespace creation success in "creating-namespace" state (own data path)
    if (
      state === "creating-namespace" &&
      namespaceMutation.isSuccess &&
      namespace &&
      organization
    ) {
      setState("finished");
      // Small delay before redirect to show success state
      const timer = setTimeout(() => {
        navigateToNamespace(organization, namespace);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [
    state,
    namespaceMutation.isSuccess,
    namespace,
    organization,
    navigateToNamespace,
  ]);

  // Handle "Upload Own Data" path
  const handleChooseOwnData = useCallback(() => {
    setState("namespace-config");
  }, []);

  // Handle "Sample Data" path - start namespace creation immediately
  const handleChooseSampleData = useCallback(() => {
    if (!organization) return;

    // Start creating namespace with managed config
    createNamespace(organization, {
      embeddingConfig: MANAGED_EMBEDDING_CONFIG,
      vectorStoreConfig: MANAGED_VECTOR_STORE_CONFIG,
    });

    setState("sample-data-type");
  }, [organization, createNamespace]);

  // Handle namespace config submission (own data path)
  const handleNamespaceConfigSubmit = useCallback(
    (config: {
      embeddingConfig?: EmbeddingConfig;
      vectorStoreConfig?: CreateVectorStoreConfig;
    }) => {
      if (!organization) return;

      setState("creating-namespace");
      createNamespace(organization, config);
    },
    [organization, createNamespace],
  );

  // Handle sample data type selection
  const handleSampleTypeSelect = useCallback(
    (type: SampleDataTypeEnum) => {
      setSelectedSampleType(type);

      // TODO: Ingest sample data based on selected type

      // If namespace is already created, navigate immediately
      if (namespaceMutation.isSuccess && namespace && organization) {
        navigateToNamespace(organization, namespace);
      }
      // If namespace is still being created, wait for it
      // The effect will handle navigation once it's done
    },
    [namespaceMutation.isSuccess, namespace, organization, navigateToNamespace],
  );

  // Handle sample data type selection when namespace finishes creating
  useEffect(() => {
    if (
      state === "sample-data-type" &&
      selectedSampleType &&
      namespaceMutation.isSuccess &&
      namespace &&
      organization
    ) {
      navigateToNamespace(organization, namespace);
    }
  }, [
    state,
    selectedSampleType,
    namespaceMutation.isSuccess,
    namespace,
    organization,
    navigateToNamespace,
  ]);

  // Handle back navigation
  const handleBackFromConfig = useCallback(() => {
    setState("data-source-choice");
  }, []);

  const handleBackFromSampleType = useCallback(() => {
    // Reset namespace mutation if user goes back
    namespaceMutation.reset();
    setNamespace(null);
    setState("data-source-choice");
  }, [namespaceMutation]);

  // Retry namespace creation
  const handleRetryNamespace = useCallback(() => {
    if (!organization) return;

    namespaceMutation.reset();
    createNamespace(organization, {
      embeddingConfig: MANAGED_EMBEDDING_CONFIG,
      vectorStoreConfig: MANAGED_VECTOR_STORE_CONFIG,
    });
  }, [organization, namespaceMutation, createNamespace]);

  // Determine namespace status for sample data path
  const getNamespaceStatus = (): "creating" | "created" | "error" => {
    if (namespaceMutation.isError) return "error";
    if (namespaceMutation.isSuccess) return "created";
    return "creating";
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <AnimatePresence mode="wait">
          {state === "creating-org" && (
            <CreatingOrgState
              key="creating-org"
              orgName={`${capitalize(userName)}'s Organization`}
            />
          )}
          {state === "data-source-choice" && (
            <DataSourceChoice
              key="data-source-choice"
              userName={userName}
              onChooseOwnData={handleChooseOwnData}
              onChooseSampleData={handleChooseSampleData}
            />
          )}
          {state === "namespace-config" && (
            <NamespaceConfig
              key="namespace-config"
              onSubmit={handleNamespaceConfigSubmit}
              onBack={handleBackFromConfig}
              isLoading={namespaceMutation.isPending}
            />
          )}
          {state === "sample-data-type" && (
            <SampleDataType
              key="sample-data-type"
              namespaceStatus={getNamespaceStatus()}
              onSelectType={handleSampleTypeSelect}
              onBack={handleBackFromSampleType}
              onRetry={handleRetryNamespace}
            />
          )}
          {state === "creating-namespace" && (
            <CreatingNamespace
              key="creating-namespace"
              namespaceName={getNamespaceName()}
            />
          )}
          {state === "exists" && <ExistsState key="exists" />}
          {state === "finished" && (
            <FinishedState
              key="finished"
              namespaceName={namespace?.slug || getNamespaceName()}
            />
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

function CreatingOrgState({ orgName }: { orgName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          >
            <div className="border-primary/20 h-20 w-20 rounded-full border-4" />
          </motion.div>
          <div className="relative flex h-20 w-20 items-center justify-center">
            <Building2Icon className="text-primary h-10 w-10" />
          </div>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-semibold tracking-tight"
      >
        Creating Your Organization
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground mt-2 text-sm"
      >
        {orgName && `Setting up "${orgName}"...`}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6"
      >
        <Spinner className="h-6 w-6" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: "100%" }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="bg-muted mt-8 h-1 w-full overflow-hidden rounded-full"
      >
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="bg-primary h-full w-1/3 rounded-full"
        />
      </motion.div>
    </motion.div>
  );
}

function ExistsState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="mb-6"
      >
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="absolute inset-0 rounded-full bg-green-500/20"
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-500" />
          </div>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-semibold tracking-tight"
      >
        Organization Ready
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground mt-2 text-sm"
      >
        Your organization is already set up and ready to use.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6"
      >
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
          <CheckCircleIcon className="h-4 w-4" />
          <span>All set!</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FinishedState({ namespaceName }: { namespaceName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="mb-6"
      >
        <div className="relative">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], opacity: [0, 0.5, 0] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="absolute inset-0 rounded-full bg-green-500"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="absolute inset-0 rounded-full bg-green-500/20"
          />
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.4,
            }}
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10"
          >
            <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-500" />
          </motion.div>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-semibold tracking-tight"
      >
        Namespace Created!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-muted-foreground mt-2 text-sm"
      >
        {namespaceName && `"${namespaceName}" has been successfully created.`}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-6 flex items-center gap-2 text-sm text-green-600 dark:text-green-500"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
        >
          <CheckCircleIcon className="h-4 w-4" />
        </motion.div>
        <span>Redirecting...</span>
      </motion.div>

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ delay: 0.8, duration: 1.5 }}
        className="bg-muted mt-6 h-1 w-full overflow-hidden rounded-full"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 0.8, duration: 1.5 }}
          className="h-full rounded-full bg-green-500"
        />
      </motion.div>
    </motion.div>
  );
}
