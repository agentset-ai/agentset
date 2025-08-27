import DashboardPageWrapper from "@/components/dashboard-page-wrapper";
import { constructMetadata } from "@/lib/metadata";

import { DeleteNamespaceButton } from "./delete-namespace-button";

export const metadata = constructMetadata({ title: "Danger" });

export default function DangerSettingsPage() {
  return (
    <DashboardPageWrapper title="Danger" requireNamespace>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">Delete Namespace</h2>
        <p className="text-muted-foreground text-sm">
          This action is irreversible.
        </p>
      </div>

      <div className="mt-8">
        <DeleteNamespaceButton />
      </div>
    </DashboardPageWrapper>
  );
}
