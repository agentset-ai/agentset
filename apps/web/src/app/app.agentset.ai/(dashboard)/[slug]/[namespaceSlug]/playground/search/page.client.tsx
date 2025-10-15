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
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
} from "@agentset/ui";
import { DEFAULT_RERANKER } from "@agentset/validation";

interface ChunkExplorerFilters {
  mode: "semantic" | "keyword";
  topK: number;
  rerank: boolean;
  rerankModel?: RerankingModel;
  rerankLimit?: number;
  filter?: Record<string, any>;
}

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

  const { data, isLoading, isFetching, error } = useQuery(
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
        {isFetching ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-4 w-48" />
              </CardHeader>
            </Card>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Skeleton key={idx} className="h-48 w-full" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                <p className="font-medium">Error occurred</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {error.message}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Search Results</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {data.totalResults} chunks found
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              {data.results.length > 0 ? (
                data.results.map((result: any) => (
                  <SearchChunk
                    key={result.id}
                    chunk={result}
                    truncate={true}
                    query={searchQuery}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-muted-foreground">
                        No chunks found matching your criteria
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Try adjusting your query or filters
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
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
