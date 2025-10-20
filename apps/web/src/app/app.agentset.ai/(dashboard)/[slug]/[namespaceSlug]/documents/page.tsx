import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import { ApiIngestModal } from "./api-ingest-modal";
import { IngestModal } from "./ingest-modal";
import JobsPageClient from "./page.client";

export default function DocumentsPage() {
  return (
    <DashboardPageWrapper title="Documents" requireNamespace>
      <div className="mb-10 flex gap-2">
        <IngestModal />

        <ApiIngestModal />
      </div>

      <JobsPageClient />
    </DashboardPageWrapper>
  );
}
