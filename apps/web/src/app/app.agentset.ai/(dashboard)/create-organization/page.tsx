import type { Metadata } from "next";
import { CreateOrganizationPageClient } from "./page.client";

export const metadata: Metadata = {
  title: "Create Organization | Agentset Console",
  description: "This will be the workspace for your various namespaces and API keys."
};

export default function CreateOrganizationPage() {
  return <CreateOrganizationPageClient />
}
