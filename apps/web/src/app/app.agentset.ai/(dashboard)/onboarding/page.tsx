import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

import { db } from "@agentset/db/client";

import { OnboardingClientPage } from "./page.client";

export const metadata: Metadata = {
  title: "Onboarding | Agentset Console",
  description: "Getting started with Agentset",
};

export default async function OnboardingPage() {
  const data = await getOnboardingData();

  return (
    <OnboardingClientPage
      onboardingData={data.onboardingData}
      userName={data.userName}
    />
  );
}

export type OnboardingData = Record<
  "org" | "namespace",
  {
    id: string;
    slug: string;
  } | null
>;
async function getOnboardingData() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const org = await db.organization.findFirst({
    where: session.session.activeOrganizationId
      ? {
          id: session.session.activeOrganizationId,
        }
      : {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
    select: { slug: true, id: true },
  });

  const onboardingData: OnboardingData = { org, namespace: null };

  if (org) {
    console.log(org.id);
    const namespace = await db.namespace.findFirst({
      where: { organizationId: org.id },
      select: { slug: true, id: true },
    });

    onboardingData.namespace = namespace;
  }

  return {
    onboardingData,
    userName: session.user.name || session.user.email.split("@")[0]!,
  };
}
