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

const PAYOUT_RAW = {
  id: 20,
  reference: "pay_001",
  amount: 10000,
  status: "pending",
  mode: "mtn_open",
  amount_transferred: null,
  amount_debited: null,
  commission: null,
  fees: null,
  merchant_reference: null,
  scheduled_at: null,
  sent_at: null,
  failed_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const WEBHOOK_RAW = {
  id: 7,
  url: "https://monsite.com/webhook",
  enabled: true,
  ssl_verify: true,
  disable_on_error: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// ── Payouts ──────────────────────────────────────────────────────────────────

describe("FedaPayClient — payouts.create", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne le payout mappé en camelCase", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/payout": PAYOUT_RAW }, 201));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const payout = await client.payouts.create({
      amount: 10000,
      mode: "mtn_open",
      customer: { email: "client@example.com" },
    });

    expect(payout.id).toBe(20);
    expect(payout.status).toBe("pending");
    expect(payout.mode).toBe("mtn_open");
    expect(payout.amountTransferred).toBeNull();
  });

  it("accepte un customer par ID", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/payout": PAYOUT_RAW }, 201));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, { body: string }])?.[1]?.body ?? "{}");
    await client.payouts.create({ amount: 10000, mode: "mtn_open", customer: { id: 5 } });

    expect(body.customer?.id ?? 5).toBe(5);
  });

  it("lève une erreur si la réponse est inattendue", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(
      client.payouts.create({ amount: 1000, mode: "mtn_open", customer: { id: 1 } }),
    ).rejects.toThrow("FedaPay payouts.create: unexpected response");
  });
});

describe("FedaPayClient — payouts.get", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne le payout par son ID", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/payout": PAYOUT_RAW }));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const payout = await client.payouts.get(20);

    expect(payout.id).toBe(20);
    expect(payout.reference).toBe("pay_001");
  });

  it("lève une erreur HTTP 404", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ message: "Not found" }, 404));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.payouts.get(999)).rejects.toThrow("404");
  });
});

describe("FedaPayClient — payouts.list", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne la liste et les métadonnées", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        "v1/payouts": [PAYOUT_RAW],
        meta: { total: 1, per_page: 25, current_page: 1, total_pages: 1 },
      }),
    );

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const result = await client.payouts.list();

    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0].id).toBe(20);
    expect(result.meta.total).toBe(1);
  });

  it("utilise /payouts/search", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/payouts": [], meta: {} }));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await client.payouts.list({ page: 1, perPage: 5 });

    const url = (mockFetch.mock.calls[0] as [string])[0];
    expect(url).toContain("/payouts/search");
  });
});

describe("FedaPayClient — payouts.send", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("résout sans erreur", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 200));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.payouts.send([{ id: 20 }])).resolves.toBeUndefined();
  });

  it("envoie les IDs et scheduled_at dans le body", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 200));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await client.payouts.send([{ id: 20, scheduledAt: "{now}" }]);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { payouts: { id: number; scheduled_at?: string }[] };
    expect(body.payouts[0].id).toBe(20);
    expect(body.payouts[0].scheduled_at).toBe("{now}");
  });
});

// ── Webhooks ─────────────────────────────────────────────────────────────────

describe("FedaPayClient — webhooks.create", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne le webhook mappé en camelCase", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/webhook": WEBHOOK_RAW }, 201));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const webhook = await client.webhooks.create({ url: "https://monsite.com/webhook" });

    expect(webhook.id).toBe(7);
    expect(webhook.url).toBe("https://monsite.com/webhook");
    expect(webhook.sslVerify).toBe(true);
    expect(webhook.disableOnError).toBe(false);
  });

  it("lève une erreur si la réponse est inattendue", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(
      client.webhooks.create({ url: "https://monsite.com/webhook" }),
    ).rejects.toThrow("FedaPay webhooks.create: unexpected response");
  });
});

describe("FedaPayClient — webhooks.get", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne le webhook par son ID", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/webhook": WEBHOOK_RAW }));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const webhook = await client.webhooks.get(7);

    expect(webhook.id).toBe(7);
    expect(webhook.enabled).toBe(true);
  });
});

describe("FedaPayClient — webhooks.list", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne la liste des webhooks", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        "v1/webhooks": [WEBHOOK_RAW],
        meta: { total: 1, per_page: 25, current_page: 1, total_pages: 1 },
      }),
    );

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const result = await client.webhooks.list();

    expect(result.webhooks).toHaveLength(1);
    expect(result.webhooks[0].url).toBe("https://monsite.com/webhook");
  });
});

describe("FedaPayClient — webhooks.update", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne le webhook mis à jour", async () => {
    const updated = { ...WEBHOOK_RAW, enabled: false };
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/webhook": updated }));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const webhook = await client.webhooks.update(7, { enabled: false });

    expect(webhook.enabled).toBe(false);
  });
});

describe("FedaPayClient — webhooks.delete", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("résout sans erreur sur 204", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(null, 204));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.webhooks.delete(7)).resolves.toBeUndefined();
  });
});
