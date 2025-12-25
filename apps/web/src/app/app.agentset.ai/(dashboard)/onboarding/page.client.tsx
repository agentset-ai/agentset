"use client";

import { useEffect, useState } from "react";
import { Building2Icon, CheckCircleIcon, FolderIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Card } from "@agentset/ui/card";
import { Spinner } from "@agentset/ui/spinner";
import { capitalize, toSlug } from "@agentset/utils";

import type { OnboardingData } from "./page";
import { useFreshNamespace } from "./_hooks/use-fresh-namespace";
import { useFreshOrganization } from "./_hooks/use-fresh-organization";

type OnboardingState =
  | "creating-org"
  | "creating-namespace"
  | "exists"
  | "finished";

export function OnboardingClientPage(props: {
  onboardingData: OnboardingData;
  userName: string;
}) {
  const orgMutation = useFreshOrganization();
  const namespaceMutation = useFreshNamespace();

  const { onboardingData, userName } = props;
  const [state, setState] = useState<OnboardingState>("creating-org");
  const [orgName, setOrgName] = useState<string>("");
  const [namespaceName, setNamespaceName] = useState<string>("");

  useEffect(() => {
    // If organization already exists, show "exists" state
    if (onboardingData.org) {
      setState("exists");
      return;
    }

    // If both mutations succeeded, show "finished" state
    if (
      orgMutation.isSuccess &&
      orgMutation.data &&
      namespaceMutation.isSuccess
    ) {
      setState("finished");
      return;
    }

    // If namespace mutation is in progress, show "creating-namespace" state
    if (namespaceMutation.isPending) {
      setState("creating-namespace");
      return;
    }

    // If organization mutation succeeded but namespace not started yet, show "creating-namespace"
    if (
      orgMutation.isSuccess &&
      orgMutation.data &&
      !namespaceMutation.isPending &&
      !namespaceMutation.isSuccess
    ) {
      setState("creating-namespace");
      return;
    }

    // If organization mutation is in progress, show "creating-org" state
    if (orgMutation.isPending) {
      setState("creating-org");
      return;
    }

    // Start creating organization if it doesn't exist
    if (
      !onboardingData.org &&
      !orgMutation.isPending &&
      !orgMutation.isSuccess
    ) {
      const name = `${capitalize(userName)}'s Organization`;
      setOrgName(name);
      orgMutation.mutate(
        { name },
        {
          onSuccess(data) {
            const name = `${capitalize(userName)}'s Namespace`;
            const slug = toSlug(name);
            setNamespaceName(name);

            namespaceMutation.mutate({
              name,
              slug,
              orgId: data.id,
            });
          },
        },
      );
    }

    // TODO: If organization exists but there is no namespace, trigger namespace creation
  }, [
    onboardingData,
    orgMutation.isPending,
    orgMutation.isSuccess,
    orgMutation.data,
    namespaceMutation.isPending,
    namespaceMutation.isSuccess,
  ]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <AnimatePresence mode="wait">
          {state === "creating-org" && (
            <CreatingOrgState key="creating-org" orgName={orgName} />
          )}
          {state === "creating-namespace" && (
            <CreatingNamespaceState
              key="creating-namespace"
              namespaceName={namespaceName}
            />
          )}
          {state === "exists" && <ExistsState key="exists" />}
          {state === "finished" && (
            <FinishedState
              key="finished"
              orgName={orgMutation.data?.name || orgName}
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
      exit={{ opacity: 0, y: -20 }}
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

function CreatingNamespaceState({ namespaceName }: { namespaceName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
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
            <FolderIcon className="text-primary h-10 w-10" />
          </div>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-semibold tracking-tight"
      >
        Creating Your Namespace
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground mt-2 text-sm"
      >
        {namespaceName && `Setting up "${namespaceName}"...`}
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

function FinishedState({ orgName }: { orgName: string }) {
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
        Organization Created!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-muted-foreground mt-2 text-sm"
      >
        {orgName && `"${orgName}" has been successfully created.`}
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
        <span>Moving on...</span>
      </motion.div>

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ delay: 0.8, duration: 2 }}
        className="bg-muted mt-6 h-1 w-full overflow-hidden rounded-full"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 0.8, duration: 2 }}
          className="h-full rounded-full bg-green-500"
        />
      </motion.div>
    </motion.div>
  );
}
