import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

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
  setSettings: (namespaceId: string, state: Partial<NamespaceState>) => void;
  reset: (namespaceId: string) => NamespaceState;
}

type ChatSettings = ChatState & ChatActions;

const defaultState: NamespaceState = {
  topK: 50,
  rerankLimit: 15,
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
        ...defaultState,
        ...state.namespaces[namespaceId],
        ...(update as NamespaceState),
      },
    },
  }) satisfies ChatState;

export const useChatSettings = create<ChatSettings>()(
  persist(
    (set) => ({
      namespaces: {},
      setSettings: (namespaceId: string, newState: Partial<NamespaceState>) =>
        set((state) => updateNamespace(state, namespaceId, newState)),
      reset: (namespaceId: string) => {
        set((state) => updateNamespace(state, namespaceId, defaultState));
        return defaultState;
      },
    }),
    {
      name: "chat-settings",
      version: 3,
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

        if (version < 3) {
          // Add default values for version 2 -> 3 migration
          const oldState = persistedState as ChatState;
          return {
            namespaces: Object.fromEntries(
              Object.entries(oldState.namespaces).map(([id, state]) => [
                id,
                {
                  ...state,
                  topK: state.topK === 15 ? 50 : state.topK,
                  rerankLimit: state.rerankLimit === 5 ? 15 : state.rerankLimit,
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

export const useNamespaceChatSettings = (namespaceId: string) => {
  const settings =
    useChatSettings(useShallow((s) => s.namespaces[namespaceId])) ??
    defaultState;

  const _setSettings = useChatSettings((s) => s.setSettings);

  const setSettings = (newState: Partial<NamespaceState>) =>
    _setSettings(namespaceId, newState);

  return [settings, setSettings] as const;
};
