"use client";

import { useMemo } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

import type { OnboardingStatus } from "./onboarding-progress";
import NamespaceOnboardingProgress from "./onboarding-progress";

export default function GetStartedClientPage() {
  const { baseUrl, organization, ...activeNamespace } = useNamespace();
  const trpc = useTRPC();

  const { data: onboardingStatus } = useQuery(
    trpc.namespace.getOnboardingStatus.queryOptions(
      {
        orgSlug: organization.slug,
        slug: activeNamespace.slug,
      },
      {
        refetchOnMount: true,
        refetchOnWindowFocus: true,
      },
    ),
  );

  const steps = useMemo(() => {
    // if it's still loading, don't show anything
    if (!onboardingStatus)
      return [
        {
          name: "Create Namespace",
          description: "Create a namespace to store your documents.",
          status: "complete",
        },
        {
          name: "Ingest Documents",
          description: "Upload documents to the namespace.",
          href: `${baseUrl}/documents`,
        },
        {
          name: "Playground",
          description: "Try chatting with your documents in the playground.",
          href: `${baseUrl}/playground`,
        },
        {
          name: "API Key",
          description: "Create an API key to use the API.",
          href: `/${organization.slug}/settings/api-keys`,
        },
      ] satisfies {
        name: string;
        description?: string;
        href?: string;
        status?: OnboardingStatus;
      }[];

    return [
      {
        name: "Create Namespace",
        description: "Create a namespace to store your documents.",
        status: "complete",
      },
      {
        name: "Ingest Documents",
        description: "Upload documents to the namespace.",
        href: `${baseUrl}/documents`,
        status: onboardingStatus.ingestDocuments ? "complete" : "current",
      },
      {
        name: "Playground",
        description: "Try chatting with your documents in the playground.",
        href: `${baseUrl}/playground`,
        status: onboardingStatus.ingestDocuments
          ? onboardingStatus.playground
            ? "complete"
            : "current"
          : "upcoming",
      },
      {
        name: "API Key",
        description: "Create an API key to use the API.",
        href: `/${organization.slug}/settings/api-keys`,
        status:
          onboardingStatus.ingestDocuments && onboardingStatus.playground
            ? onboardingStatus.createApiKey
              ? "complete"
              : "current"
            : "upcoming",
      },
    ] satisfies {
      name: string;
      description?: string;
      href?: string;
      status: OnboardingStatus;
    }[];
  }, [onboardingStatus, baseUrl, organization.slug]);

  return <NamespaceOnboardingProgress steps={steps} />;
}
