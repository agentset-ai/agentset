import type { CoreMessage, LanguageModelV1 } from "ai";

import type { Namespace } from "@agentset/db";
import type {
  QueryVectorStoreOptions,
  QueryVectorStoreResult,
} from "@agentset/engine";
import { KeywordStore, queryVectorStore } from "@agentset/engine";

import type { Queries } from "./utils";
import { evaluateQueries, generateQueries } from "./utils";

export type AgenticSearchNamespace = Pick<
  Namespace,
  | "id"
  | "vectorStoreConfig"
  | "embeddingConfig"
  | "createdAt"
  | "keywordEnabled"
>;

export async function agenticSearch(
  namespace: AgenticSearchNamespace,
  {
    model,
    messages,
    queryOptions,
    maxEvals = 3,
    tokenBudget = 4096,
    onQueries,
  }: {
    model: LanguageModelV1;
    messages: CoreMessage[];
    queryOptions?: Omit<QueryVectorStoreOptions, "query">;
    maxEvals?: number;
    tokenBudget?: number;
    onQueries?: (queries: Queries) => void;
  },
) {
  const queries: Queries = [];
  const chunks: Record<string, QueryVectorStoreResult["results"][number]> = {};
  const queryToResult: Record<string, QueryVectorStoreResult> = {};
  let totalQueries = 0;
  let totalTokens = 0;

  const lastMessage = messages[messages.length - 1]!.content as string;

  for (let i = 0; i < maxEvals; i++) {
    console.log(`[EVAL LOOP] ${i + 1} / ${maxEvals}`);
    console.dir(messages, { depth: null });
    console.dir(queries, { depth: null });

    const { queries: newQueries, totalTokens: queriesTokens } =
      await generateQueries(model, messages, queries);

    if (i === 0) {
      newQueries.unshift({
        query: lastMessage,
        type: "semantic",
      });
    }

    newQueries.forEach((q) => {
      if (queries.includes(q)) return;
      queries.push(q);
    });

    totalTokens += queriesTokens;

    if (onQueries) onQueries(newQueries);

    const data = (
      await Promise.all(
        newQueries.map(async (query) => {
          if (namespace.keywordEnabled && query.type === "keyword") {
            const keywordStore = new KeywordStore(
              namespace.id,
              queryOptions?.tenantId,
            );

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

          const queryResult = await queryVectorStore(namespace, {
            query: query.query,
            topK: 50,
            rerankLimit: 15,
            rerank: true,
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
