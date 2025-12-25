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
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Check if organization already exists
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

  // If org exists, redirect to the organization dashboard
  if (org) {
    redirect(`/${org.slug}`);
  }

  // Otherwise show org creation UI
  const userName = session.user.name || session.user.email.split("@")[0]!;

  return <OnboardingClientPage userName={userName} />;
}
