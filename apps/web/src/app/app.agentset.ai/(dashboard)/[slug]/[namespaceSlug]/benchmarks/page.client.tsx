"use client";

import { useState } from "react";
import { InfoTooltip } from "@/components/info-tooltip";
import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import type { QueryVectorStoreResult } from "@agentset/engine";
import { Button } from "@agentset/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@agentset/ui/card";
import { cn } from "@agentset/ui/cn";
import { Input } from "@agentset/ui/input";
import { Separator } from "@agentset/ui/separator";

export default function BenchmarksPageClient() {
  const namespace = useNamespace();
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"normal" | "agentic">("normal");

  const { mutateAsync, isPending, data } = useMutation({
    mutationFn: async ({
      message,
      mode,
    }: {
      message: string;
      mode: "normal" | "agentic";
    }) => {
      const response = await fetch(
        `/api/benchmark?namespaceId=${namespace.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            message,
            topK: 50,
            rerankLimit: 15,
            rerank: true,
            temperature: 0,
            includeMetadata: true,
            mode,
          }),
        },
      );

      const json = (await response.json()) as {
        success: boolean;
        data: {
          correctness: {
            score: number;
            maxScore: number;
            feedback: string;
          };
          faithfulness: {
            faithful: boolean;
          };
          relevance: {
            relevant: boolean;
          };
          answer: string;
          sources: QueryVectorStoreResult["results"];
        };
      };

      if (!json.success) {
        throw new Error("Failed to evaluate benchmark");
      }

      return json.data;
    },
    onSuccess: (data) => {
      logEvent("benchmark_evaluated", {
        namespaceId: namespace.id,
        mode,
        correctness: data.correctness.score,
        faithfulness: data.faithfulness.faithful,
        relevance: data.relevance.relevant,
      });
    },
    onError: (error) => {
      toast.error("Failed to evaluate benchmark");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    void mutateAsync({ message, mode });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Benchmark Evaluation
        </h1>
        <p className="text-muted-foreground mt-2">
          Test your queries and evaluate the response quality, faithfulness, and
          relevance.
        </p>
      </div>

      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Correctness
                <InfoTooltip text="Correctness is the percentage of the time the answer is correct." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {data.correctness.score.toFixed(2)} /{" "}
                  {data.correctness.maxScore.toFixed(2)}
                </div>
                <p className="text-muted-foreground text-sm">
                  {data.correctness.feedback}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Faithfulness
                <InfoTooltip text="Faithfulness is the percentage of the time the answer is faithful to the context." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {data.faithfulness.faithful
                    ? "✅ Faithful"
                    : "❌ Not Faithful"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Relevance
                <InfoTooltip text="Relevance is the percentage of the time the answer is relevant to the query." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {data.relevance.relevant ? "✅ Relevant" : "❌ Not Relevant"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant={mode === "normal" ? "default" : "outline"}
          onClick={() => setMode("normal")}
          className={cn(
            "rounded-full",
            mode === "normal" && "border border-transparent",
          )}
        >
          Normal
        </Button>
        <Button
          variant={mode === "agentic" ? "default" : "outline"}
          onClick={() => setMode("agentic")}
          className={cn(
            "rounded-full",
            mode === "agentic" && "border border-transparent",
          )}
        >
          Agentic
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your query here..."
        />

        <Button type="submit" disabled={isPending || !message.trim()}>
          {isPending && <Loader2Icon className="h-4 w-4 animate-spin" />}
          Evaluate
        </Button>
      </form>

      {data && (
        <div>
          <p className="whitespace-pre-wrap">{data.answer}</p>

          <div className="mt-10 flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Sources</h3>
            <Separator />
            <div className="flex flex-col gap-10">
              {data.sources.map((source, index) => (
                <div key={index} className="space-y-2">
                  <p className="font-medium">Source {index + 1}</p>
                  <p className="text-muted-foreground text-sm">{source.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
