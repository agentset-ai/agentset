"use client";

import AddEditWebhookForm from "@/components/webhooks/add-edit-webhook-form";
import { useOrganization } from "@/hooks/use-organization";

export default function NewWebhookPage() {
  const organization = useOrganization();

  return (
    <div className="mx-auto max-w-2xl">
      <AddEditWebhookForm
        organizationId={organization.id}
        organizationSlug={organization.slug}
      />
    </div>
  );
}
