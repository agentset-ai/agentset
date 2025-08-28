"use client";

import { useState } from "react";
import SearchChunk from "@/components/search-chunk";
import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";

import { Button, EmptyState, Input, Skeleton } from "@agentset/ui";

export default function SearchPageClient() {
  const namespace = useNamespace();
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const trpc = useTRPC();

  const { data, isLoading, isFetching } = useQuery(
    trpc.search.search.queryOptions(
      {
        namespaceId: namespace.id,
        query: searchQuery,
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
    logEvent("playground_search_performed", {
      namespaceId: namespace.id,
      query,
    });
    setSearchQuery(query);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your search query..."
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={isLoading || !query.trim()}
          isLoading={isLoading || isFetching}
        >
          <SearchIcon className="size-4" />
          Search
        </Button>
      </form>

      <div className="mt-6">
        {isFetching ? (
          <div className="w-full">
            <div className="w-full">
              <p className="text-sm font-medium">Queries performed:</p>
              <div className="mt-1 flex w-full flex-col gap-2">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-3/4" />
              </div>
            </div>

            <div className="mt-6 flex w-full flex-col gap-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        ) : data ? (
          <div>
            <div>
              <p className="text-sm font-medium">Queries performed:</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {data.queries.map((q, idx) => (
                  <i key={idx}>
                    {q.query}
                    {idx !== data.queries.length - 1 ? ", " : ""}
                  </i>
                ))}
              </p>
            </div>

            <div className="mt-6 flex w-full flex-col gap-6">
              {data.results.length > 0 ? (
                data.results.map((result) => (
                  <SearchChunk
                    key={result.id}
                    chunk={result}
                    truncate={true}
                    query={searchQuery}
                  />
                ))
              ) : (
                <p>No results found</p>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            title="Start searching"
            description="Enter a search query to get started"
            icon={SearchIcon}
          />
        )}
      </div>
    </div>
  );
}
