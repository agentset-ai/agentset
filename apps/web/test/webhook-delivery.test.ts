import { AbortTaskRunError } from "@trigger.dev/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchWebhookWithRetry,
  resolveWebhookDelivery,
} from "../../../packages/jobs/src/webhook-delivery";

const PAYLOAD = {
  id: "evt_1",
  event: "document.ready",
  createdAt: "2026-01-01T00:00:00.000Z",
  data: { id: "doc_1" },
};

const WEBHOOK = { url: "https://hooks.example.com/in?token=t", secret: "s" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveWebhookDelivery", () => {
  it("uses a body that carries the delivery as is", async () => {
    const body = {
      webhookId: "wh_1",
      eventId: "evt_1",
      event: "document.ready" as const,
      ...WEBHOOK,
      payload: PAYLOAD,
    };
    const getWebhook = vi.fn();
    const getEventPayload = vi.fn();

    await expect(
      resolveWebhookDelivery(body, { getWebhook, getEventPayload }),
    ).resolves.toBe(body);
    expect(getWebhook).not.toHaveBeenCalled();
    expect(getEventPayload).not.toHaveBeenCalled();
  });

  it("loads the webhook and the stored event for an id-only body", async () => {
    const getWebhook = vi.fn().mockResolvedValue(WEBHOOK);
    const getEventPayload = vi.fn().mockResolvedValue(PAYLOAD);

    await expect(
      resolveWebhookDelivery(
        { webhookId: "wh_1", eventId: "evt_1" },
        { getWebhook, getEventPayload },
      ),
    ).resolves.toStrictEqual({
      webhookId: "wh_1",
      eventId: "evt_1",
      event: "document.ready",
      url: WEBHOOK.url,
      secret: WEBHOOK.secret,
      payload: PAYLOAD,
    });
    expect(getWebhook).toHaveBeenCalledWith("wh_1");
    expect(getEventPayload).toHaveBeenCalledWith("evt_1");
  });

  it.each([
    ["the webhook was deleted", null, PAYLOAD, "Webhook not found"],
    [
      "the event expired",
      WEBHOOK,
      null,
      "Webhook event payload not found or expired",
    ],
    [
      "the event is malformed",
      WEBHOOK,
      { id: "evt_1" },
      "Webhook event payload not found or expired",
    ],
  ])(
    "fails without retrying when %s",
    async (_label, webhook, payload, message) => {
      const error = await resolveWebhookDelivery(
        { webhookId: "wh_1", eventId: "evt_1" },
        {
          getWebhook: vi.fn().mockResolvedValue(webhook),
          getEventPayload: vi.fn().mockResolvedValue(payload),
        },
      ).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AbortTaskRunError);
      expect((error as Error).message).toBe(message);
    },
  );
});

describe("fetchWebhookWithRetry", () => {
  const REQUEST = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Agentset-Signature": "sig",
    },
    body: JSON.stringify(PAYLOAD),
  };

  const stubFetch = (...results: (number | Error)[]) => {
    const fetchMock = vi.fn();
    for (const result of results) {
      if (typeof result === "number") {
        fetchMock.mockResolvedValueOnce(new Response("ok", { status: result }));
      } else {
        fetchMock.mockRejectedValueOnce(result);
      }
    }
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  const connectionError = () =>
    new TypeError("fetch failed", { cause: new Error("ECONNREFUSED") });

  it("returns the first successful response", async () => {
    const fetchMock = stubFetch(200);
    const sleep = vi.fn().mockResolvedValue(undefined);

    const response = await fetchWebhookWithRetry(WEBHOOK.url, REQUEST, sleep);

    expect(response.status).toBe(200);
    expect(sleep).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      WEBHOOK.url,
      expect.objectContaining({
        method: "POST",
        body: REQUEST.body,
        headers: { ...REQUEST.headers, "x-retry-count": "1" },
      }),
    );
  });

  it("backs off on 3xx-5xx responses", async () => {
    const fetchMock = stubFetch(500, 404, 200);
    const sleep = vi.fn().mockResolvedValue(undefined);

    const response = await fetchWebhookWithRetry(WEBHOOK.url, REQUEST, sleep);

    expect(response.status).toBe(200);
    expect(sleep.mock.calls.map((c) => c[0] as number)).toEqual([
      12_000, 144_000,
    ]);
    expect(
      fetchMock.mock.calls.map(
        (c) =>
          (c[1] as { headers: Record<string, string> }).headers[
            "x-retry-count"
          ],
      ),
    ).toEqual(["1", "2", "3"]);
  });

  it("returns the last response after 10 attempts", async () => {
    const fetchMock = stubFetch(...Array<number>(10).fill(503));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const response = await fetchWebhookWithRetry(WEBHOOK.url, REQUEST, sleep);

    expect(response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(sleep.mock.calls.map((c) => c[0] as number)).toEqual([
      12_000, 144_000, 1_728_000, 20_736_000, 86_400_000, 86_400_000,
      86_400_000, 86_400_000, 86_400_000,
    ]);
  });

  it("does not retry 2xx responses", async () => {
    const fetchMock = stubFetch(202);
    const sleep = vi.fn();

    const response = await fetchWebhookWithRetry(WEBHOOK.url, REQUEST, sleep);

    expect(response.status).toBe(202);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries connection errors 3 times", async () => {
    const fetchMock = stubFetch(
      connectionError(),
      connectionError(),
      connectionError(),
    );
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      fetchWebhookWithRetry(WEBHOOK.url, REQUEST, sleep),
    ).rejects.toThrow("fetch failed");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    for (const [delay] of sleep.mock.calls as [number][]) {
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(60_000);
    }
  });

  it("recovers from a timeout", async () => {
    const timeout = new DOMException("aborted", "AbortError");
    const fetchMock = stubFetch(timeout, 200);
    const sleep = vi.fn().mockResolvedValue(undefined);

    const response = await fetchWebhookWithRetry(WEBHOOK.url, REQUEST, sleep);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rethrows other errors immediately", async () => {
    const fetchMock = stubFetch(new RangeError("bad"));
    const sleep = vi.fn();

    await expect(
      fetchWebhookWithRetry(WEBHOOK.url, REQUEST, sleep),
    ).rejects.toThrow("bad");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
