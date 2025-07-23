import baseConfig from "@agentset/eslint-config/base";
import reactConfig from "@agentset/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["dist/**"],
  },
  ...baseConfig,
  ...reactConfig,
];
