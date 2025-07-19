import baseConfig from "@agentset/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".trigger/**"],
  },
  ...baseConfig,
];
