import type { UIMessageChunk } from "ai";

const TAG_NAME = "planning";
const OPEN_TAG = `<${TAG_NAME}>`;
const CLOSE_TAG = `</${TAG_NAME}>`;

/**
 * Inlined from `ai/src/util/get-potential-start-index.ts` (not re-exported by
 * the public API). Returns the index where `searchedText` begins in `text`,
 * or where a partial match could begin at the end of `text`. Null otherwise.
 */
function getPotentialStartIndex(
  text: string,
  searchedText: string,
): number | null {
  if (searchedText.length === 0) return null;

  const directIndex = text.indexOf(searchedText);
  if (directIndex !== -1) return directIndex;

  for (let i = text.length - 1; i >= 0; i--) {
    const suffix = text.slice(i);
    if (searchedText.startsWith(suffix)) return i;
  }

  return null;
}

type TextState = {
  buffer: string;
  isInsidePlanning: boolean;
  planningCounter: number;
  currentPlanningId: string | null;
  currentPlanningText: string;
};

/**
 * Streaming `<planning>` extractor for the UI message stream.
 *
 * - Strips `<planning>...</planning>` content from outgoing `text-delta` chunks.
 * - Side-emits `data-planning` chunks (same `id` per block, growing `data`) so
 *   the client renders planning as a first-class UI part without parsing tags.
 *
 * Apply AFTER `createUIMessageStream` so it only affects the wire format.
 */
export function extractPlanningStreamTransform(): TransformStream<
  UIMessageChunk,
  UIMessageChunk
> {
  const states: Record<string, TextState> = {};

  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      if (chunk.type === "text-start") {
        states[chunk.id] = {
          buffer: "",
          isInsidePlanning: false,
          planningCounter: 0,
          currentPlanningId: null,
          currentPlanningText: "",
        };
        controller.enqueue(chunk);
        return;
      }

      if (chunk.type === "text-delta") {
        const state = states[chunk.id];
        if (state == null) {
          controller.enqueue(chunk);
          return;
        }
        state.buffer += chunk.delta;
        processBuffer(state, chunk.id, controller, false);
        return;
      }

      if (chunk.type === "text-end") {
        const state = states[chunk.id];
        if (state != null) {
          processBuffer(state, chunk.id, controller, true);
          delete states[chunk.id];
        }
        controller.enqueue(chunk);
        return;
      }

      controller.enqueue(chunk);
    },
  });
}

function processBuffer(
  state: TextState,
  textId: string,
  controller: TransformStreamDefaultController<UIMessageChunk>,
  flushPartial: boolean,
): void {
  while (true) {
    const tag = state.isInsidePlanning ? CLOSE_TAG : OPEN_TAG;
    const startIdx = getPotentialStartIndex(state.buffer, tag);

    if (startIdx === null) {
      publish(state, textId, state.buffer, controller);
      state.buffer = "";
      return;
    }

    publish(state, textId, state.buffer.slice(0, startIdx), controller);

    const isFullMatch = startIdx + tag.length <= state.buffer.length;
    if (!isFullMatch) {
      const remaining = state.buffer.slice(startIdx);
      if (flushPartial) {
        publish(state, textId, remaining, controller);
        state.buffer = "";
      } else {
        state.buffer = remaining;
      }
      return;
    }

    state.buffer = state.buffer.slice(startIdx + tag.length);

    if (state.isInsidePlanning) {
      state.currentPlanningId = null;
      state.currentPlanningText = "";
      state.isInsidePlanning = false;
    } else {
      state.currentPlanningId = `planning-${textId}-${state.planningCounter++}`;
      state.currentPlanningText = "";
      state.isInsidePlanning = true;
    }
  }
}

function publish(
  state: TextState,
  textId: string,
  content: string,
  controller: TransformStreamDefaultController<UIMessageChunk>,
): void {
  if (content.length === 0) return;

  if (state.isInsidePlanning) {
    state.currentPlanningText += content;
    const planningChunk: UIMessageChunk = {
      type: "data-planning",
      id: state.currentPlanningId as string,
      data: state.currentPlanningText,
    };
    controller.enqueue(planningChunk);
  } else {
    controller.enqueue({
      type: "text-delta",
      id: textId,
      delta: content,
    });
  }
}
