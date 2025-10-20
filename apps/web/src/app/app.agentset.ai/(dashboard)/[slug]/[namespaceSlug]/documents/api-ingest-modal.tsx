"use client";

import { curlExample, tsSdkExample } from "@/lib/code-examples/ingest";
import { Code2Icon } from "lucide-react";

import { Button } from "@agentset/ui/button";

import ApiDialog from "../playground/api-dialog";

export function ApiIngestModal() {
  return (
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
          Use the API to ingest documents into the knowledge base. For extended
          info, <br />
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
  );
}
