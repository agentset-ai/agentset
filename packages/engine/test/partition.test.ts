import { afterEach, describe, expect, it, vi } from "vitest";

const SOURCE_URL = "https://storage.example.com/signed";

const loadPartition = async (region: "us" | "eu" | undefined) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_REGION", region);

  const storage = {
    presignGetUrl: vi.fn((key: string) =>
      Promise.resolve({ url: SOURCE_URL, key }),
    ),
    uploadObject: vi.fn(() => Promise.resolve({})),
    deleteObject: vi.fn(() => Promise.resolve({})),
  };
  vi.doMock("@agentset/storage", () => storage);

  const partition = await import("../src/partition");
  return { ...partition, storage };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@agentset/storage");
});

const baseArgs = {
  ingestJobConfig: null,
  namespaceId: "ns_1",
  triggerTokenId: "token_1",
  triggerAccessToken: "access_1",
};

const textDocument = {
  id: "doc_1",
  name: "notes.txt",
  config: null,
  tenantId: null,
  source: { type: "TEXT" as const, text: "Hello world" },
};

const managedFileDocument = {
  id: "doc_2",
  name: "report.pdf",
  config: null,
  tenantId: null,
  source: {
    type: "MANAGED_FILE" as const,
    key: "namespaces/ns_1/report.pdf",
  },
};

const fileDocument = {
  id: "doc_3",
  name: "remote.pdf",
  config: null,
  tenantId: null,
  source: {
    type: "FILE" as const,
    fileUrl: "https://files.example.com/remote.pdf",
  },
};

describe("getPartitionDocumentBody on us", () => {
  it("sends text inline", async () => {
    const { getPartitionDocumentBody, storage } =
      await loadPartition(undefined);

    const body = await getPartitionDocumentBody({
      ...baseArgs,
      document: textDocument,
    });

    expect(Object.keys(body)).toEqual([
      "trigger_token_id",
      "trigger_access_token",
      "namespace_id",
      "document_id",
      "batch_size",
      "text",
      "filename",
      "extra_metadata",
    ]);
    expect(body.text).toBe("Hello world");
    expect(body.filename).toBe("doc_1.txt");
    expect(body.url).toBeUndefined();
    expect(storage.uploadObject).not.toHaveBeenCalled();
    expect(storage.presignGetUrl).not.toHaveBeenCalled();
  });

  it("presigns managed files with the default expiry", async () => {
    const { getPartitionDocumentBody, storage } = await loadPartition("us");

    const body = await getPartitionDocumentBody({
      ...baseArgs,
      document: managedFileDocument,
    });

    expect(storage.presignGetUrl).toHaveBeenCalledWith(
      "namespaces/ns_1/report.pdf",
    );
    expect(body.url).toBe(SOURCE_URL);
    expect(body.filename).toBe("report.pdf");
  });
});

describe("getPartitionDocumentBody on eu", () => {
  it("uploads text to storage and sends a presigned url", async () => {
    const { getPartitionDocumentBody, storage } = await loadPartition("eu");

    const body = await getPartitionDocumentBody({
      ...baseArgs,
      document: textDocument,
    });

    expect(storage.uploadObject).toHaveBeenCalledWith(
      "documents/doc_1/source.txt",
      "Hello world",
      { contentType: "text/plain" },
    );
    expect(storage.presignGetUrl).toHaveBeenCalledWith(
      "documents/doc_1/source.txt",
      { expiresIn: 3 * 60 * 60 },
    );
    expect(body.url).toBe(SOURCE_URL);
    expect(body.filename).toBe("doc_1.txt");
    expect("text" in body).toBe(false);
    expect(JSON.stringify(body)).not.toContain("Hello world");
  });

  it("keeps the rest of the body unchanged", async () => {
    const eu = await loadPartition("eu");
    const euBody = await eu.getPartitionDocumentBody({
      ...baseArgs,
      document: textDocument,
    });

    const us = await loadPartition("us");
    const usBody = await us.getPartitionDocumentBody({
      ...baseArgs,
      document: textDocument,
    });

    const { url: _url, ...euRest } = euBody;
    const { text: _text, ...usRest } = usBody;
    expect(euRest).toEqual(usRest);
  });

  it("presigns managed files for 3 hours", async () => {
    const { getPartitionDocumentBody, storage } = await loadPartition("eu");

    const body = await getPartitionDocumentBody({
      ...baseArgs,
      document: managedFileDocument,
    });

    expect(storage.presignGetUrl).toHaveBeenCalledWith(
      "namespaces/ns_1/report.pdf",
      { expiresIn: 3 * 60 * 60 },
    );
    expect(body.url).toBe(SOURCE_URL);
    expect(storage.uploadObject).not.toHaveBeenCalled();
  });

  it("passes file urls through", async () => {
    const { getPartitionDocumentBody, storage } = await loadPartition("eu");

    const body = await getPartitionDocumentBody({
      ...baseArgs,
      document: fileDocument,
    });

    expect(body.url).toBe("https://files.example.com/remote.pdf");
    expect(storage.uploadObject).not.toHaveBeenCalled();
    expect(storage.presignGetUrl).not.toHaveBeenCalled();
  });
});

describe("partition text source", () => {
  it("deletes the stored text by document id", async () => {
    const { deletePartitionTextSource, getPartitionTextSourceKey, storage } =
      await loadPartition("eu");

    await deletePartitionTextSource("doc_1");

    expect(getPartitionTextSourceKey("doc_1")).toBe(
      "documents/doc_1/source.txt",
    );
    expect(storage.deleteObject).toHaveBeenCalledWith(
      "documents/doc_1/source.txt",
    );
  });
});

describe("serializePartitionBody", () => {
  const bodyWithMetadata = (bytes: number) =>
    ({
      trigger_token_id: "token_1",
      trigger_access_token: "access_1",
      namespace_id: "ns_1",
      document_id: "doc_1",
      batch_size: 30,
      url: SOURCE_URL,
      extra_metadata: { notes: "x".repeat(bytes) },
    }) as never;

  it.each([1024, 3 * 1024 * 1024])(
    "returns the JSON body on us (%i bytes of metadata)",
    async (bytes) => {
      const { serializePartitionBody } = await loadPartition("us");
      const body = bodyWithMetadata(bytes);

      expect(serializePartitionBody(body)).toBe(JSON.stringify(body));
    },
  );

  it("returns the JSON body on eu below the limit", async () => {
    const { serializePartitionBody } = await loadPartition("eu");
    const body = bodyWithMetadata(1024 * 1024);

    expect(serializePartitionBody(body)).toBe(JSON.stringify(body));
  });

  it("rejects bodies close to 2 MiB on eu", async () => {
    const { serializePartitionBody } = await loadPartition("eu");

    expect(() =>
      serializePartitionBody(bodyWithMetadata(1.95 * 1024 * 1024)),
    ).toThrow("Document metadata is too large");
  });
});
