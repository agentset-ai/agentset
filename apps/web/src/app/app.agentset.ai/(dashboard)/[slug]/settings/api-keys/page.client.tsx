"use client";

import { useOrganization } from "@/hooks/use-organization";
import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@agentset/ui/data-table";

import { columns } from "./columns";
import CreateApiKey from "./create-api-key";

export default function ApiKeysPage() {
  const organization = useOrganization();

  if (!organization.isAdmin) {
    return <div>You are not authorized to view this page</div>;
  }

  return (
    <>
      <div className="mb-5 flex justify-end">
        <CreateApiKey orgId={organization.id} />
      </div>

      <ApiKeysList orgId={organization.id} />
    </>
  );
}

function ApiKeysList({ orgId }: { orgId: string }) {
  const { data, isLoading } = useQuery(
    orpc.apiKey.getApiKeys.queryOptions({
      input: { orgId },
    }),
  );

  return <DataTable columns={columns} data={data} isLoading={isLoading} />;
}
