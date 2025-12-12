"use client";

import {
  curlExample,
  pythonExample,
  tsSdkExample,
} from "@/lib/code-examples/ingest";
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
          Use the API to ingest documents into the knowledge base. For local
          file uploads and API documentation, visit our{" "}
          <a
            href="https://docs.agentset.ai/data-ingestion/file-uploads"
            target="_blank"
            className="text-foreground underline"
          >
            docs
          </a>
          .
        </>
      }
      tabs={[
        { title: "cURL", language: "bash", code: curlExample },
        { title: "Javascript", language: "typescript", code: tsSdkExample },
        { title: "Python", language: "python", code: pythonExample },
      ]}
    />
  );
}
