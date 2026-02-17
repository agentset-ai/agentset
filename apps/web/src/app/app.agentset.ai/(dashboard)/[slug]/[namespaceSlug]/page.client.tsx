"use client";

import { useState } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { formatNumber } from "@/lib/utils";

import { CodeSnippet } from "@agentset/ui/ai/snippet";
import { Button } from "@agentset/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@agentset/ui/card";
import { Separator } from "@agentset/ui/separator";
import { Skeleton } from "@agentset/ui/skeleton";
import { prefixId } from "@agentset/utils";

const SensitiveInfo = ({ info }: { info: unknown }) => {
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <div className="relative min-h-40 overflow-hidden">
        <pre>
          {JSON.stringify(
            {
              type: "sensitive",
              info: "Click to show",
            },
            null,
            2,
          )}
        </pre>

        <div className="absolute inset-0 isolate flex items-center justify-center">
          <div className="absolute inset-0 -z-1 scale-200 bg-white/10 backdrop-blur-sm" />
          <Button onClick={() => setShow(true)}>Show</Button>
        </div>
      </div>
    );
  }

  return <pre>{JSON.stringify(info, null, 2)}</pre>;
};

export default function NamespacePage() {
  const namespace = useNamespace();

  if (namespace.isLoading) {
    return (
      <div className="flex h-full flex-col space-y-6">
        <div className="flex items-center gap-5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-32" />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="gap-0">
              <div className="p-6">
                <Skeleton className="mb-2 h-4 w-24" />
              </div>
              <div className="p-6 pt-0">
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-10">
          <div>
            <Skeleton className="mb-2 h-6 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div>
            <Skeleton className="mb-2 h-6 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const id = prefixId(namespace.id, "ns_");

  return (
    <>
      <div className="flex items-center gap-5">
        <h3 className="text-xl font-bold">{namespace.name}</h3>
        <CodeSnippet code={id} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <Card className="gap-0">
          <CardHeader>
            <CardDescription>Ingestion Jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatNumber(namespace.totalIngestJobs ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader>
            <CardDescription>Documents</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatNumber(namespace.totalDocuments ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader>
            <CardDescription>Pages</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatNumber(namespace.totalPages ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 flex flex-col gap-10">
        <div>
          <h2 className="text-lg font-medium">Vector Store</h2>
          <Separator className="my-2" />

          {namespace.vectorStoreConfig ? (
            <SensitiveInfo info={namespace.vectorStoreConfig} />
          ) : (
            <p className="text-muted-foreground">
              No vector store configured for this namespace. Using default
              vector store.
            </p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-medium">Embedding</h2>
          <Separator className="my-2" />
          {namespace.embeddingConfig ? (
            <SensitiveInfo info={namespace.embeddingConfig} />
          ) : (
            <p className="text-muted-foreground">
              No embedding configured for this namespace. Using default
              embedding.
            </p>
          )}
        </div>

        {/* <div >
                <h2 className="text-lg font-medium">File Store</h2>
                <Separator className="my-2" />
                {activeNamespace.fileStoreConfig ? (
                  <SensitiveInfo info={activeNamespace.fileStoreConfig} />
                ) : (
                  <p className="text-muted-foreground">
                    No file store configured for this namespace. Using default file
                    store.
                  </p>
                )}
              </div> */}
      </div>
    </>
  );
}
