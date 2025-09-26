export const ts = (statements: TemplateStringsArray) => {
  return statements.join("\n").trim();
};

// We're not using Speakeasy for the TS SDK and instead maintain one ourselves.
// This helper function adds TS code samples to the operation object.
// It also converts the TS code to JS
export const makeCodeSamples = (
  code: string,
  { isNs = true }: { isNs?: boolean } = {},
) => {
  const fullCode = `
import { Agentset } from "agentset";
${code.includes("fs.") ? "import fs from 'fs';\n" : ""}
const agentset = new Agentset({ apiKey: 'agentset_xxx' });
${isNs ? "const ns = agentset.namespace('ns_xxx');\n" : ""}
${code}
`;

  return {
    "x-codeSamples": [
      {
        lang: "TypeScript",
        source: fullCode,
      },
    ],
  };
};
