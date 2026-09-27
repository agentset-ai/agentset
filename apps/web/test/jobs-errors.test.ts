import { AbortTaskRunError } from "@trigger.dev/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

const importErrors = async (region: "us" | "eu") => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);
  return import("../../../packages/jobs/src/errors");
};

const contentError = () =>
  Object.assign(new Error("Invalid input: chunk text from the document"), {
    name: "APICallError",
    status: 400,
    cause: new Error("prompt"),
    requestBodyValues: { input: ["chunk text"] },
  });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sanitizeRunErrors", () => {
  it("returns the run function itself on us", async () => {
    const { sanitizeHookErrors, sanitizeRunErrors } = await importErrors("us");
    const run = (_payload: { documentId: string }) => Promise.resolve("ok");
    const hook = (_params: { payload: unknown; error: unknown }) =>
      Promise.resolve();

    expect(sanitizeRunErrors(run)).toBe(run);
    expect(sanitizeHookErrors(hook)).toBe(hook);
  });

  it("rethrows the original error on us", async () => {
    const { sanitizeRunErrors } = await importErrors("us");
    const error = contentError();

    await expect(
      sanitizeRunErrors(() => Promise.reject(error))({ documentId: "doc_1" }),
    ).rejects.toBe(error);
  });

  it("returns the run output on eu", async () => {
    const { sanitizeRunErrors } = await importErrors("eu");

    await expect(
      sanitizeRunErrors((payload: { documentId: string }) =>
        Promise.resolve(payload.documentId),
      )({ documentId: "doc_1" }),
    ).resolves.toBe("doc_1");
  });

  it("rethrows the type, status and payload IDs only on eu", async () => {
    const { sanitizeRunErrors } = await importErrors("eu");
    const run = sanitizeRunErrors(
      (_payload: { documentId: string; ingestJobId: string; text: string }) =>
        Promise.reject(contentError()),
    );

    const error = (await run({
      documentId: "doc_1",
      ingestJobId: "job_1",
      text: "secret text",
    }).catch((e: unknown) => e)) as Error;

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("APICallError");
    expect(error.message).toBe(
      "Task failed (status=400, documentId=doc_1, ingestJobId=job_1)",
    );
    expect(error).toMatchObject({ status: 400 });
    expect(error.cause).toBeUndefined();
    expect(JSON.stringify({ ...error, stack: error.stack })).not.toMatch(
      /chunk text|prompt|secret text/,
    );
  });

  it("keeps the fixed messages the jobs throw on eu", async () => {
    const { sanitizeTaskError } = await importErrors("eu");

    expect(sanitizeTaskError(new Error("Partition Error")).message).toBe(
      "Partition Error",
    );
  });

  it("keeps the error name that skips retries on eu", async () => {
    const { sanitizeTaskError } = await importErrors("eu");

    const error = sanitizeTaskError(new AbortTaskRunError("Webhook not found"));

    expect(error.name).toBe("AbortTaskRunError");
    expect(error.message).toBe("Webhook not found");
  });

  it("passes Trigger.dev internal errors through on eu", async () => {
    const { sanitizeTaskError } = await importErrors("eu");
    const error = Object.assign(new Error("MAX_DURATION_EXCEEDED"), {
      name: "TriggerInternalError",
    });

    expect(sanitizeTaskError(error)).toBe(error);
  });

  it("summarizes non-error values on eu", async () => {
    const { sanitizeTaskError } = await importErrors("eu");

    const error = sanitizeTaskError("chunk text", { documentId: "doc_1" });

    expect(error.name).toBe("string");
    expect(error.message).toBe("Task failed (documentId=doc_1)");
  });
});

describe("sanitizeHookErrors", () => {
  it("rethrows hook errors with the payload IDs on eu", async () => {
    const { sanitizeHookErrors } = await importErrors("eu");
    const hook = sanitizeHookErrors<{ jobId: string }>(() =>
      Promise.reject(contentError()),
    );

    await expect(
      hook({ payload: { jobId: "job_1" }, error: new Error("run error") }),
    ).rejects.toMatchObject({
      name: "APICallError",
      message: "Task failed (status=400, jobId=job_1)",
    });
  });
});

describe("getTaskFailureMessage", () => {
  const FAILED_MESSAGE =
    "Processing failed. Please try again, or contact support if it keeps happening.";

  it("keeps the error message on us", async () => {
    const { getTaskFailureMessage } = await importErrors("us");

    expect(getTaskFailureMessage(contentError())).toBe(
      "Invalid input: chunk text from the document",
    );
    expect(getTaskFailureMessage(new Error("Partition Error"))).toBe(
      "Partition Error",
    );
  });

  it.each([
    ["a non-error value", "chunk text"],
    ["an empty message", new Error("")],
  ])("falls back to Unknown error for %s on us", async (_label, error) => {
    const { getTaskFailureMessage } = await importErrors("us");

    expect(getTaskFailureMessage(error)).toBe("Unknown error");
  });

  it("replaces the sanitized run error with a generic message on eu", async () => {
    const { getTaskFailureMessage, sanitizeRunErrors } =
      await importErrors("eu");
    const run = sanitizeRunErrors((_payload: { documentId: string }) =>
      Promise.reject(contentError()),
    );

    const error = await run({ documentId: "doc_1" }).catch((e: unknown) => e);

    expect((error as Error).message).toBe(
      "Task failed (status=400, documentId=doc_1)",
    );
    expect(getTaskFailureMessage(error)).toBe(FAILED_MESSAGE);
  });

  it.each([
    ["a non-error value", "chunk text"],
    ["an empty message", new Error("")],
    [
      "a Trigger.dev internal error",
      Object.assign(new Error("MAX_DURATION_EXCEEDED"), {
        name: "TriggerInternalError",
      }),
    ],
  ])("uses the generic message for %s on eu", async (_label, error) => {
    const { getTaskFailureMessage } = await importErrors("eu");

    expect(getTaskFailureMessage(error)).toBe(FAILED_MESSAGE);
  });

  it.each(["Partition Error", "Document not found"])(
    "keeps the fixed %s message on eu",
    async (message) => {
      const { getTaskFailureMessage, sanitizeTaskError } =
        await importErrors("eu");

      expect(getTaskFailureMessage(sanitizeTaskError(new Error(message)))).toBe(
        message,
      );
    },
  );
});
