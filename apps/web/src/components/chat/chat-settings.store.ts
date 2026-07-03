import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

import type { LLM, RerankingModel } from "@agentset/validation";
import { DEFAULT_LLM, DEFAULT_RERANKER } from "@agentset/validation";

export type ChatMode = "accurate" | "fast";

interface NamespaceState {
  topK: number;
  rerankLimit: number;
  systemPrompt: string | null;
  temperature: number;
  mode?: ChatMode;
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

export const DEFAULT_CHAT_SETTINGS: NamespaceState = {
  topK: 30,
  rerankLimit: 10,
  systemPrompt: null,
  temperature: 0,
  mode: "accurate",
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
        ...DEFAULT_CHAT_SETTINGS,
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
        set((state) =>
          updateNamespace(state, namespaceId, DEFAULT_CHAT_SETTINGS),
        );
        return DEFAULT_CHAT_SETTINGS;
      },
    }),
    {
      name: "chat-settings",
      version: 4,
      migrate(persistedState: unknown, version: number) {
        let state = persistedState as ChatState;

        if (version < 2) {
          // Add default model values for version 1 -> 2 migration
          state = {
            namespaces: Object.fromEntries(
              Object.entries(state.namespaces).map(([id, namespace]) => [
                id,
                {
                  ...namespace,
                  rerankModel: DEFAULT_RERANKER,
                  // the default model at the time of this migration
                  llmModel: "openai:gpt-4.1",
                },
              ]),
            ),
          };
        }

        if (version < 3) {
          // Add default values for version 2 -> 3 migration
          state = {
            namespaces: Object.fromEntries(
              Object.entries(state.namespaces).map(([id, namespace]) => [
                id,
                {
                  ...namespace,
                  topK: namespace.topK === 15 ? 50 : namespace.topK,
                  rerankLimit:
                    namespace.rerankLimit === 5 ? 15 : namespace.rerankLimit,
                },
              ]),
            ),
          };
        }

        if (version < 4) {
          // 3 -> 4: agentic search migration. Legacy modes
          // (normal/agentic/deepResearch) collapse into "accurate", the old
          // defaults (model, topK, rerankLimit) move to the agentic defaults.
          state = {
            namespaces: Object.fromEntries(
              Object.entries(state.namespaces).map(([id, namespace]) => {
                const legacy = namespace as Omit<NamespaceState, "mode"> & {
                  mode?: string;
                };

                // users who saved the old single-shot RAG prompt verbatim
                // should pick up the new agentic default
                const isLegacyDefaultPrompt =
                  namespace.systemPrompt?.trim() ===
                  DEFAULT_SYSTEM_PROMPT.compile().trim();

                const topK =
                  namespace.topK === 50
                    ? DEFAULT_CHAT_SETTINGS.topK
                    : namespace.topK;
                const rerankLimit =
                  namespace.rerankLimit === 15
                    ? DEFAULT_CHAT_SETTINGS.rerankLimit
                    : namespace.rerankLimit;

                return [
                  id,
                  {
                    ...namespace,
                    mode: legacy.mode === "fast" ? "fast" : "accurate",
                    systemPrompt: isLegacyDefaultPrompt
                      ? null
                      : namespace.systemPrompt,
                    // the old default model moves to the new default
                    llmModel:
                      namespace.llmModel === "openai:gpt-4.1"
                        ? DEFAULT_LLM
                        : namespace.llmModel,
                    // remap the old default reranker to the new default
                    rerankModel:
                      (namespace.rerankModel as string) ===
                      "zeroentropy:zerank-2"
                        ? DEFAULT_RERANKER
                        : namespace.rerankModel,
                    topK,
                    // the topK remap can undercut a custom rerankLimit
                    rerankLimit: Math.min(rerankLimit, topK),
                  },
                ];
              }),
            ),
          };
        }

        return state;
      },
    },
  ),
);

export const useNamespaceChatSettings = (namespaceId: string) => {
  const settings =
    useChatSettings(useShallow((s) => s.namespaces[namespaceId])) ??
    DEFAULT_CHAT_SETTINGS;

  const _setSettings = useChatSettings((s) => s.setSettings);

  const setSettings = (newState: Partial<NamespaceState>) =>
    _setSettings(namespaceId, newState);

  return [settings, setSettings] as const;
};
