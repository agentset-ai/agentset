import { createHash } from "node:crypto";
import {
  AGENTIC_SYSTEM_PROMPT,
  isKnownDefaultPrompt,
  LEGACY_DEFAULT_PROMPT_2025_03,
  PLATFORM_CONTRACT_PROMPT,
  resolveSystemPrompt,
} from "@/lib/agentic-search/prompts";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import { describe, expect, it } from "vitest";

const LEGACY_DEFAULT = DEFAULT_SYSTEM_PROMPT.compile();

describe("resolveSystemPrompt", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["whitespace-only", "   \n\t"],
    ["legacy default verbatim", LEGACY_DEFAULT],
    [
      "legacy default with CRLF line endings",
      LEGACY_DEFAULT.replace(/\n/g, "\r\n"),
    ],
    ["legacy default with surrounding whitespace", `\n  ${LEGACY_DEFAULT}\n\n`],
    // pre-b5ae41e compile() didn't trim, so stored copies carry newlines
    ["2025-03 default variant", `\n${LEGACY_DEFAULT_PROMPT_2025_03}\n`],
    ["agentic default verbatim", AGENTIC_SYSTEM_PROMPT],
    [
      "agentic default with surrounding whitespace",
      `${AGENTIC_SYSTEM_PROMPT}\n`,
    ],
  ])(
    "resolves %s to the tuned agentic prompt, identically",
    (_label, stored) => {
      // identity, not just equality: the tuned default must ship byte-identical
      expect(resolveSystemPrompt(stored)).toBe(AGENTIC_SYSTEM_PROMPT);
    },
  );

  it.each([
    // the production-incident class: a prompt derived from the old default,
    // still mandating bracket-number [n] citations
    [
      "legacy default with one edit",
      `${LEGACY_DEFAULT}\nAlways answer in Arabic.`,
    ],
    [
      "fully custom persona",
      "You are a helpful pirate. Answer in pirate speak.",
    ],
  ])("appends the platform contract to %s", (_label, stored) => {
    const resolved = resolveSystemPrompt(stored);
    expect(resolved.startsWith(stored.trim())).toBe(true);
    expect(resolved.endsWith(PLATFORM_CONTRACT_PROMPT)).toBe(true);
  });
});

describe("isKnownDefaultPrompt", () => {
  it("accepts every default the app has ever auto-persisted", () => {
    expect(isKnownDefaultPrompt(null)).toBe(true);
    expect(isKnownDefaultPrompt(undefined)).toBe(true);
    expect(isKnownDefaultPrompt("")).toBe(true);
    expect(isKnownDefaultPrompt("  \n")).toBe(true);
    expect(isKnownDefaultPrompt(LEGACY_DEFAULT)).toBe(true);
    expect(isKnownDefaultPrompt(AGENTIC_SYSTEM_PROMPT)).toBe(true);
  });

  it("treats any edit as custom", () => {
    expect(isKnownDefaultPrompt(`${LEGACY_DEFAULT}.`)).toBe(false);
    expect(isKnownDefaultPrompt("You are a helpful assistant.")).toBe(false);
  });
});

describe("PLATFORM_CONTRACT_PROMPT", () => {
  it("teaches the only tag shape the renderer accepts", () => {
    // rehype-sanitize only admits lowercase <citation> with attribute `ids`
    expect(PLATFORM_CONTRACT_PROMPT).toContain('<citation ids="');
    expect(PLATFORM_CONTRACT_PROMPT).not.toContain("<Citation");
    expect(PLATFORM_CONTRACT_PROMPT).not.toMatch(/<citation id=/);
  });

  it("stays in sync with AGENTIC_SYSTEM_PROMPT on the shared contract", () => {
    // both prompts must teach the same citation tag; drift ships two
    // divergent model contracts and breaks exactly the custom-prompt users
    const citationFormat = '<citation ids="<chunk-id1>,<chunk-id2>,..." />';
    expect(AGENTIC_SYSTEM_PROMPT).toContain(citationFormat);
    expect(PLATFORM_CONTRACT_PROMPT).toContain(citationFormat);

    const labelRule =
      "set `label` to a short description of the search intent written in the user's language. Never change `query`";
    expect(AGENTIC_SYSTEM_PROMPT).toContain(labelRule);
    expect(PLATFORM_CONTRACT_PROMPT).toContain(labelRule);
  });
});

describe("DEFAULT_SYSTEM_PROMPT (frozen legacy text)", () => {
  it("has not been edited", () => {
    // this text is an exact-match detector for prompts persisted before the
    // agentic migration — editing it silently breaks default detection for
    // every pre-migration hosting row. See the comment in lib/prompts.ts.
    const hash = createHash("sha256").update(LEGACY_DEFAULT).digest("hex");
    expect(hash).toBe(
      "d5990b7a07519eff3588225de1d9a4c5bc7895a6050f0c102c0740a7de9ab38d",
    );
  });
});
