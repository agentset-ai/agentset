"use client";

import { notFound } from "next/navigation";
import SearchChunk from "@/components/search-chunk";
import { useHosting } from "@/contexts/hosting-context";
import { SearchIcon } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@agentset/ui/button";
import { EmptyState } from "@agentset/ui/empty-state";
import { Input } from "@agentset/ui/input";
import { Skeleton } from "@agentset/ui/skeleton";

import { useSearch } from "./use-search";

export default function SearchPage() {
  const { searchEnabled, exampleSearchQueries } = useHosting();
  const {
    inputQuery,
    setInputQuery,
    query,
    handleSubmit,
    data,
    isFetching,
    handleExampleClick,
  } = useSearch();

  const allData = data ? data.chunks : null;

  if (!searchEnabled) {
    notFound();
  }

  return (
    <div className="bg-background flex h-[calc(100dvh-calc(var(--spacing)*20))] min-w-0 flex-col pt-4">
      <form
        className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6"
        onSubmit={handleSubmit}
      >
        <Input
          type="text"
          placeholder="Search..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
        />

        <Button type="submit" isLoading={isFetching}>
          Search
        </Button>
      </form>

      <div className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6">
        {isFetching ? (
          <SearchSkeleton />
        ) : !data ? (
          <div className="w-full rounded-md">
            <div className="grid w-full gap-2 sm:grid-cols-2">
              {exampleSearchQueries.map((example, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: 0.05 * index }}
                  key={`suggested-${index}`}
                  className={index > 1 ? "hidden sm:block" : "block"}
                >
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleExampleClick(example);
                    }}
                    className="block h-auto w-full rounded-xl border px-4 py-3.5 text-left text-sm"
                  >
                    {example}
                  </Button>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.05 * exampleSearchQueries.length }}
              className="mt-44 w-full"
            >
              <EmptyState
                icon={SearchIcon}
                title="Start your search"
                description="Enter a search query to get started"
              />
            </motion.div>
          </div>
        ) : (
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <p className="text-sm font-medium">Queries performed:</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {data.queries.map((q, idx) => (
                  <i key={idx}>
                    {q.query}
                    {idx !== data.queries.length - 1 ? ", " : ""}
                  </i>
                ))}
              </p>
            </motion.div>

            <motion.div
              className="mt-6 flex w-full flex-col gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.05 * 1 }}
            >
              {allData!.length > 0 ? (
                allData!.map((result) => (
                  <SearchChunk
                    key={result.id}
                    chunk={result}
                    truncate={true}
                    query={query}
                  />
                ))
              ) : (
                <p>No results found</p>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

const SearchSkeleton = () => {
  return (
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
  );
};
