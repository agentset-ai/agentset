import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
  Redis: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: mocks.Redis.mockImplementation(() => ({
    set: mocks.set,
    get: mocks.get,
  })),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("webhook event store", () => {
  it("stores event payloads for 3 days", async () => {
    const { storeWebhookEventPayload } =
      await import("@agentset/webhooks/event-store");
    const payload = { id: "evt_1", event: "document.ready", data: {} };

    await storeWebhookEventPayload("evt_1", payload);

    expect(mocks.set).toHaveBeenCalledExactlyOnceWith(
      "webhook-event:evt_1",
      payload,
      { ex: 259_200 },
    );
  });

  it("reads event payloads by event id", async () => {
    const { getWebhookEventPayload } =
      await import("@agentset/webhooks/event-store");
    mocks.get.mockResolvedValueOnce({ id: "evt_1" });

    await expect(getWebhookEventPayload("evt_1")).resolves.toEqual({
      id: "evt_1",
    });
    expect(mocks.get).toHaveBeenCalledWith("webhook-event:evt_1");
  });
});
