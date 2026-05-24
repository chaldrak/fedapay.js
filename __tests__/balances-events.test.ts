import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { FedaPayClient } from "../src/client.js";

const mockFetch = jest.spyOn(globalThis, "fetch");

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

const BALANCE_RAW = {
  id: 1,
  amount: 150000,
  mode: "mtn_open",
  account_id: 42,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const EVENT_RAW = {
  id: 5,
  type: "transaction.approved",
  entity: { id: 1, amount: 5000 },
  object_id: 1,
  account_id: 42,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

describe("FedaPayClient — balances.get", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne la balance mappée en camelCase", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/balance": BALANCE_RAW }));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const balance = await client.balances.get(1);

    expect(balance.id).toBe(1);
    expect(balance.amount).toBe(150000);
    expect(balance.mode).toBe("mtn_open");
    expect(balance.createdAt).toBe("2026-01-01T00:00:00Z");
  });

  it("lève une erreur si la réponse est inattendue", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.balances.get(1)).rejects.toThrow(
      "FedaPay balances.get: unexpected response",
    );
  });

  it("lève une erreur HTTP 404", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ message: "Not found" }, 404));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.balances.get(999)).rejects.toThrow("404");
  });
});

describe("FedaPayClient — balances.list", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne la liste des balances", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        "v1/balances": [BALANCE_RAW],
        meta: { total: 1, per_page: 25, current_page: 1, total_pages: 1 },
      }),
    );

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const result = await client.balances.list();

    expect(result.balances).toHaveLength(1);
    expect(result.balances[0].mode).toBe("mtn_open");
    expect(result.meta.total).toBe(1);
  });
});

describe("FedaPayClient — events.get", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne l'événement mappé en camelCase", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/event": EVENT_RAW }));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const event = await client.events.get(5);

    expect(event.id).toBe(5);
    expect(event.type).toBe("transaction.approved");
    expect(event.objectId).toBe(1);
    expect(event.deletedAt).toBeNull();
  });

  it("lève une erreur si la réponse est inattendue", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.events.get(5)).rejects.toThrow(
      "FedaPay events.get: unexpected response",
    );
  });
});

describe("FedaPayClient — events.list", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne la liste des événements et les métadonnées", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        "v1/events": [EVENT_RAW],
        meta: { total: 1, per_page: 25, current_page: 1, total_pages: 1 },
      }),
    );

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const result = await client.events.list();

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("transaction.approved");
    expect(result.meta.total).toBe(1);
  });

  it("transmet les paramètres de pagination", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/events": [], meta: {} }));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await client.events.list({ page: 2, perPage: 10 });

    const url = (mockFetch.mock.calls[0] as [string])[0];
    expect(url).toContain("/events");
    expect(url).toContain("page=2");
    expect(url).toContain("per_page=10");
  });
});
