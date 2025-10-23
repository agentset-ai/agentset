import type { LanguageModel, ModelMessage } from "ai";

import type {
  QueryVectorStoreOptions,
  QueryVectorStoreResult,
} from "@agentset/engine";
import { KeywordStore, queryVectorStore } from "@agentset/engine";

import type { Queries } from "./utils";
import { evaluateQueries, generateQueries } from "./utils";

export async function agenticSearch({
  model,
  keywordStore,
  messages,
  queryOptions,
  maxEvals = 3,
  tokenBudget = 4096,
  onQueries,
}: {
  model: LanguageModel;
  messages: ModelMessage[];
  queryOptions: Omit<QueryVectorStoreOptions, "query">;
  keywordStore?: KeywordStore;
  maxEvals?: number;
  tokenBudget?: number;
  onQueries?: (queries: Queries) => void;
}) {
  const queries: Queries = [];
  const chunks: Record<string, QueryVectorStoreResult["results"][number]> = {};
  const queryToResult: Record<string, QueryVectorStoreResult> = {};
  let totalQueries = 0;
  let totalTokens = 0;

  const lastMessage = messages[messages.length - 1]!.content as string;

  for (let i = 0; i < maxEvals; i++) {
    const { queries: newQueries, totalTokens: queriesTokens } =
      await generateQueries(model, messages, queries);

    newQueries.forEach((q) => {
      if (queries.some((q2) => q2.query === q.query)) return;
      queries.push(q);
    });

    totalTokens += queriesTokens;

    if (onQueries) onQueries(newQueries);

    const data = (
      await Promise.all(
        [
          // add the last message as a query if it's the first eval loop
          ...(i === 0
            ? [
                {
                  query: lastMessage,
                  type: "semantic" as const,
                },
              ]
            : []),
          ...newQueries,
        ].map(async (query) => {
          if (keywordStore && query.type === "keyword") {
            const keywordResult = await keywordStore.search(query.query, {
              limit: 15,
              includeMetadata: true,
            });

            totalQueries++;
            return {
              query: query.query,
              unorderedIds: keywordResult.results.map((r) => r.id),
              results: keywordResult.results,
            };
          }

          const queryResult = await queryVectorStore({
            query: query.query,
            mode: queryOptions.vectorStore.supportsKeyword()
              ? query.type
              : undefined,
            rerank: { model: "cohere:rerank-v3.5", limit: 15 },
            includeMetadata: true,
            ...queryOptions,
          });
          totalQueries++;
          return queryResult;
        }),
      )
    ).filter((d) => d !== null);

    data.forEach((d) => {
      queryToResult[d.query] = d;

      d.results.forEach((r) => {
        if (chunks[r.id]) return;
        chunks[r.id] = r;
      });
    });

    const { canAnswer, totalTokens: evalsTokens } = await evaluateQueries(
      model,
      messages,
      Object.values(chunks),
    );
    totalTokens += evalsTokens;

    if (canAnswer || totalTokens >= tokenBudget) break;
  }

  return {
    queries,
    chunks,
    queryToResult,
    totalQueries,
  };
}
