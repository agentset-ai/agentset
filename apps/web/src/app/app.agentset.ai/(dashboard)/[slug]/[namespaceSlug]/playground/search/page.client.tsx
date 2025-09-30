"use client";

import { useState } from "react";
import SearchChunk from "@/components/search-chunk";
import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { FilterIcon, SearchIcon, SettingsIcon } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Slider,
  Switch,
} from "@agentset/ui";

interface ChunkExplorerFilters {
  mode: "semantic" | "keyword";
  topK: number;
  minScore?: number;
  rerank: boolean;
  rerankLimit?: number;
  includeMetadata: boolean;
  includeRelationships: boolean;
  filter?: Record<string, any>;
}

export default function ChunkExplorerPageClient() {
  const namespace = useNamespace();
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ChunkExplorerFilters>({
    mode: "semantic",
    topK: 20,
    rerank: true,
    includeMetadata: true,
    includeRelationships: false,
  });
  const trpc = useTRPC();

  const { data, isLoading, isFetching, error } = useQuery(
    trpc.search.exploreChunks.queryOptions(
      {
        namespaceId: namespace.id,
        query: searchQuery,
        ...filters,
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
    logEvent("playground_chunk_exploration", {
      namespaceId: namespace.id,
      query,
      mode: filters.mode,
      topK: filters.topK,
    });
    setSearchQuery(query);
  };

  const handleFilterChange = (key: keyof ChunkExplorerFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardContent className="pt-6">
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

            {/* Quick Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="mode" className="text-sm">
                  Mode:
                </Label>
                <Select
                  value={filters.mode}
                  onValueChange={(value: "semantic" | "keyword") =>
                    handleFilterChange("mode", value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semantic">Semantic</SelectItem>
                    <SelectItem
                      value="keyword"
                      disabled={!namespace.keywordEnabled}
                    >
                      Keyword {!namespace.keywordEnabled && "(Disabled)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm">Results:</Label>
                <Select
                  value={filters.topK.toString()}
                  onValueChange={(value) =>
                    handleFilterChange("topK", parseInt(value))
                  }
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

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <FilterIcon className="size-4" />
                Advanced Filters
                {showFilters && (
                  <Badge variant="secondary" className="ml-1">
                    ON
                  </Badge>
                )}
              </Button>
            </div>

            {/* Advanced Filters */}
            <Collapsible open={showFilters}>
              <CollapsibleContent className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">
                      Minimum Score: {filters.minScore?.toFixed(2) || "None"}
                    </Label>
                    <Slider
                      value={[filters.minScore || 0]}
                      onValueChange={([value]) =>
                        handleFilterChange(
                          "minScore",
                          value && value > 0 ? value : undefined,
                        )
                      }
                      max={1}
                      min={0}
                      step={0.01}
                      className="w-full"
                    />
                  </div>

                  {filters.mode === "semantic" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm">
                          Rerank Limit: {filters.rerankLimit || filters.topK}
                        </Label>
                        <Slider
                          value={[filters.rerankLimit || filters.topK]}
                          onValueChange={([value]) =>
                            handleFilterChange("rerankLimit", value)
                          }
                          max={filters.topK}
                          min={1}
                          step={1}
                          disabled={!filters.rerank}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="rerank"
                      checked={filters.rerank}
                      onCheckedChange={(checked) =>
                        handleFilterChange("rerank", checked)
                      }
                      disabled={filters.mode === "keyword"}
                    />
                    <Label htmlFor="rerank" className="text-sm">
                      Enable Reranking{" "}
                      {filters.mode === "keyword" && "(Semantic only)"}
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="metadata"
                      checked={filters.includeMetadata}
                      onCheckedChange={(checked) =>
                        handleFilterChange("includeMetadata", checked)
                      }
                    />
                    <Label htmlFor="metadata" className="text-sm">
                      Include Metadata
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="relationships"
                      checked={filters.includeRelationships}
                      onCheckedChange={(checked) =>
                        handleFilterChange("includeRelationships", checked)
                      }
                    />
                    <Label htmlFor="relationships" className="text-sm">
                      Include Relationships
                    </Label>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <div>
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
            {/* Results Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Chunk Explorer Results
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{data.mode}</Badge>
                    <Badge variant="secondary">
                      {data.totalResults} chunks found
                    </Badge>
                  </div>
                </div>
                <div className="text-muted-foreground space-y-1 text-sm">
                  <p>
                    <strong>Query:</strong> {data.query}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span>Top K: {data.parameters.topK}</span>
                    {data.parameters.minScore && (
                      <span>
                        Min Score: {data.parameters.minScore.toFixed(2)}
                      </span>
                    )}
                    {data.parameters.rerank && (
                      <span>
                        Reranked:{" "}
                        {data.parameters.rerankLimit || data.parameters.topK}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Chunks */}
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
            title="Chunk Explorer"
            description="Enter a search query to explore chunks in your namespace with advanced filtering options"
            icon={SearchIcon}
          />
        )}
      </div>
    </div>
  );
}
