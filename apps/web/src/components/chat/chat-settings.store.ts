import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DEFAULT_LLM,
  DEFAULT_RERANKER,
  LLM,
  RerankingModel,
} from "@agentset/validation";

interface NamespaceState {
  topK: number;
  rerankLimit: number;
  systemPrompt: string | null;
  temperature: number;
  mode?: "normal" | "agentic" | "deepResearch";
  rerankModel: RerankingModel;
  llmModel: LLM;
}

interface ChatState {
  namespaces: Record<string, NamespaceState>;
}

interface ChatActions {
  getNamespace: (namespaceId: string) => NamespaceState;

  setAll: (namespaceId: string, state: Partial<NamespaceState>) => void;
  // setSystemPrompt: (namespaceId: string, systemPrompt: string | null) => void;
  // setTemperature: (namespaceId: string, temperature: number) => void;
  // setTopK: (namespaceId: string, topK: number) => void;
  // setRerankLimit: (namespaceId: string, rerankLimit: number) => void;
  // setRerankModel: (namespaceId: string, rerankModel: RerankingModel) => void;
  // setLlmModel: (namespaceId: string, llmModel: LLM) => void;
  // setMode: (
  //   namespaceId: string,
  //   mode: "normal" | "agentic" | "deepResearch",
  // ) => void;

  reset: (namespaceId: string) => NamespaceState;
}

type ChatSettings = ChatState & ChatActions;

const defaultState: NamespaceState = {
  topK: 15,
  rerankLimit: 5,
  systemPrompt: null,
  temperature: 0,
  mode: "agentic",
  rerankModel: DEFAULT_RERANKER,
  llmModel: DEFAULT_LLM,
};

const updateNamespace = (
  state: ChatSettings,
  namespaceId: string,
  update: Partial<NamespaceState>,
) =>
  ({
    namespaces: {
      ...state.namespaces,
      [namespaceId]: {
        ...state.namespaces[namespaceId],
        ...(update as NamespaceState),
      },
    },
  }) satisfies ChatState;

export const useChatSettings = create<ChatSettings>()(
  persist(
    (set, get) => ({
      namespaces: {},
      getNamespace: (namespaceId: string) => {
        const state = get();
        return state.namespaces[namespaceId] ?? defaultState;
      },
      setAll: (namespaceId: string, newState: Partial<NamespaceState>) =>
        set((state) => updateNamespace(state, namespaceId, newState)),
      reset: (namespaceId: string) => {
        set((state) => updateNamespace(state, namespaceId, defaultState));
        return defaultState;
      },
    }),
    {
      name: "chat-settings",
      version: 2,
      migrate(persistedState: unknown, version: number) {
        if (version < 2) {
          // Add default model values for version 1 -> 2 migration
          const oldState = persistedState as ChatState;
          return {
            namespaces: Object.fromEntries(
              Object.entries(oldState.namespaces).map(([id, state]) => [
                id,
                {
                  ...state,
                  rerankModel: DEFAULT_RERANKER,
                  llmModel: DEFAULT_LLM,
                },
              ]),
            ),
          };
        }
        return persistedState;
      },
    },
  ),
);
