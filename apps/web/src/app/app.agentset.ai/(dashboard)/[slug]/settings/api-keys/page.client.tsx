"use client";

import { RegionBadge } from "@/components/region-badge";
import { useOrganization } from "@/hooks/use-organization";
import { API_DOMAIN } from "@/lib/constants";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@agentset/ui/cn";
import { DataTable } from "@agentset/ui/data-table";
import { isEuRegion } from "@agentset/utils";

import { columns } from "./columns";
import CreateApiKey from "./create-api-key";

export default function ApiKeysPage() {
  const organization = useOrganization();

  if (!organization.isAdmin) {
    return <div>You are not authorized to view this page</div>;
  }

  return (
    <>
      <div
        className={cn(
          "mb-5 flex justify-end",
          isEuRegion && "items-center justify-between gap-4",
        )}
      >
        {isEuRegion && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <RegionBadge />
            Keys created here only work with {API_DOMAIN}
          </p>
        )}

        <CreateApiKey orgId={organization.id} />
      </div>

      <ApiKeysList orgId={organization.id} />
    </>
  );
}

function ApiKeysList({ orgId }: { orgId: string }) {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.apiKey.getApiKeys.queryOptions({
      orgId,
    }),
  );

  return <DataTable columns={columns} data={data} isLoading={isLoading} />;
}
