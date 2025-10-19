import DashboardPageWrapper from "@/components/dashboard-page-wrapper";
import { curlExample, tsSdkExample } from "@/lib/code-examples/ingest";
import { Code2Icon } from "lucide-react";

import { Button } from "@agentset/ui/button";

import ApiDialog from "../playground/api-dialog";
import { IngestModal } from "./ingest-modal";
import JobsPageClient from "./page.client";

export default function DocumentsPage() {
  return (
    <DashboardPageWrapper title="Documents" requireNamespace>
      <div className="mb-10 flex gap-2">
        <IngestModal />

        <ApiDialog
          title="Ingest via API"
          trigger={(props) => (
            <Button variant="ghost" {...props}>
              <Code2Icon className="size-4" />
              Ingest via API
            </Button>
          )}
          description={
            <>
              Use the API to ingest documents into the knowledge base. For
              extended info, <br />
              checkout the{" "}
              <a
                href="https://docs.agentset.ai/api-reference/endpoint/ingest-jobs/create"
                target="_blank"
                className="text-foreground underline"
              >
                docs
              </a>
            </>
          }
          tabs={[
            { title: "cURL", code: curlExample },
            { title: "Javascript", code: tsSdkExample },
          ]}
        />
      </div>

      <JobsPageClient />
    </DashboardPageWrapper>
  );
}
