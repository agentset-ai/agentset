import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import GetStartedClientPage from "./page.client";

export default function GetStartedPage() {
  return (
    <DashboardPageWrapper title="Quick Start" requireNamespace>
      <div className="flex flex-col items-center justify-center gap-20 pt-20">
        <h1 className="text-foreground text-4xl font-bold">
          Create your first RAG pipeline
        </h1>

        <GetStartedClientPage />
      </div>
    </DashboardPageWrapper>
  );
}
