export async function register() {
  // Next.js supplies these variables before running instrumentation.
  // eslint-disable-next-line no-restricted-properties
  const isNodeRuntime = process.env.NEXT_RUNTIME === "nodejs";
  // eslint-disable-next-line no-restricted-properties
  const isAgentPondEnabled = process.env.AGENTPOND_ENABLED === "true";

  if (!isNodeRuntime || !isAgentPondEnabled) {
    return;
  }

  const [
    { createFilesSpanExporterFromRuntimeEnv },
    { isOpenInferenceSpan, OpenInferenceSimpleSpanProcessor },
    { registerOTel },
  ] = await Promise.all([
    import("@agentpond/files-sdk/otel"),
    import("@arizeai/openinference-vercel"),
    import("@vercel/otel"),
  ]);

  registerOTel({
    serviceName: "agentset",
    spanProcessors: [
      new OpenInferenceSimpleSpanProcessor({
        exporter: createFilesSpanExporterFromRuntimeEnv(),
        spanFilter: isOpenInferenceSpan,
        reparentOrphanedSpans: true,
      }),
    ],
  });
}
