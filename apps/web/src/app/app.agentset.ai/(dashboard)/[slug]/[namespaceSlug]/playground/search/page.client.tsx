"use client";

import { useState } from "react";
import { RerankerSelector } from "@/components/reranker-selector";
import SearchChunk from "@/components/search-chunk";
import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";

import type { RerankingModel } from "@agentset/validation";
import { Badge } from "@agentset/ui/badge";
import { Button } from "@agentset/ui/button";
import { Card, CardContent, CardTitle } from "@agentset/ui/card";
import { DataWrapper } from "@agentset/ui/data-wrapper";
import { EmptyState } from "@agentset/ui/empty-state";
import { Input } from "@agentset/ui/input";
import { Label } from "@agentset/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agentset/ui/select";
import { Skeleton } from "@agentset/ui/skeleton";
import { Switch } from "@agentset/ui/switch";
import { DEFAULT_RERANKER } from "@agentset/validation";

export default function ChunkExplorerPageClient() {
  const namespace = useNamespace();
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [topK, setTopK] = useState(20);
  const [rerank, setRerank] = useState(true);
  const [rerankModel, setRerankModel] =
    useState<RerankingModel>(DEFAULT_RERANKER);
  const [rerankLimit, setRerankLimit] = useState(20);
  const trpc = useTRPC();

  const { data, isLoading, isFetching, error, isEnabled } = useQuery(
    trpc.search.search.queryOptions(
      {
        namespaceId: namespace.id,
        query: searchQuery,
        topK,
        rerank,
        rerankModel,
        rerankLimit,
      },
      {
        enabled: searchQuery.length > 0,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
      },
    ),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    logEvent("playground_search", {
      namespaceId: namespace.id,
      query,
      topK,
      rerank,
      rerankModel,
      rerankLimit,
    });
    setSearchQuery(query);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search query to explore chunks..."
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isLoading || !query.trim()}
            isLoading={isLoading || isFetching}
          >
            <SearchIcon className="size-4" />
            Explore
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Results:</Label>
            <Select
              value={topK.toString()}
              onValueChange={(value) => setTopK(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="rerank"
              checked={rerank}
              onCheckedChange={(checked) => setRerank(checked)}
            />
            <Label htmlFor="rerank" className="text-sm">
              Rerank
            </Label>
          </div>

          {rerank && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Model:</Label>
                <RerankerSelector
                  value={rerankModel}
                  onValueChange={setRerankModel}
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm">Rerank Limit:</Label>
                <Select
                  value={(rerankLimit || topK).toString()}
                  onValueChange={(value) => setRerankLimit(parseInt(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.min(topK, 10) }, (_, i) => {
                      const value = Math.ceil((topK * (i + 1)) / 10);
                      return (
                        <SelectItem key={value} value={value.toString()}>
                          {value}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </form>

      {/* Results */}
      <div className="mt-16">
        {isEnabled ? (
          <DataWrapper
            data={data}
            isLoading={isLoading}
            error={error}
            loadingState={
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Search Results</CardTitle>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-48 w-full" />
                  ))}
                </div>
              </div>
            }
            errorState={
              <Card>
                <CardContent>
                  <div className="text-center text-red-600">
                    <p className="font-medium">Error occurred</p>
                  </div>
                </CardContent>
              </Card>
            }
            emptyState={
              <Card>
                <CardContent>
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      No chunks found matching your criteria
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Try adjusting your query
                    </p>
                  </div>
                </CardContent>
              </Card>
            }
          >
            {(results) => (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Search Results</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {results.length} chunks found
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  {results.map((result) => (
                    <SearchChunk
                      key={result.id}
                      chunk={result}
                      truncate={true}
                      query={searchQuery}
                    />
                  ))}
                </div>
              </div>
            )}
          </DataWrapper>
        ) : (
          <EmptyState
            title="Search"
            description="Enter a search query to explore chunks in your namespace with advanced filtering options"
            icon={SearchIcon}
          />
        )}
      </div>
    </div>
  );
}
