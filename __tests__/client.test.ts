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

const TX_RAW = {
  id: 1,
  reference: "ref_001",
  amount: 5000,
  status: "pending",
  description: "Commande #1",
  callback_url: "https://example.com/cb",
  payment_url: "https://checkout.fedapay.com/pay/abc",
  mode: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("FedaPayClient — constructeur", () => {
  it("lève une erreur si secretKey est absent", () => {
    expect(() => new FedaPayClient({ secretKey: "" })).toThrow("secretKey is required");
  });

  it("lève une erreur si verifyWebhookSignature est appelé sans webhookSecret", () => {
    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    expect(() => client.verifyWebhookSignature("body", "t=1,s=abc")).toThrow(
      "webhookSecret is required",
    );
  });

  it("instancie correctement en mode sandbox (défaut)", () => {
    expect(() => new FedaPayClient({ secretKey: "sk_test_123" })).not.toThrow();
  });

  it("instancie correctement en mode live", () => {
    expect(
      () => new FedaPayClient({ secretKey: "sk_live_123", environment: "live" }),
    ).not.toThrow();
  });
});

describe("FedaPayClient — getTransaction", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne la transaction mappée en camelCase", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ "v1/transaction": TX_RAW }),
    );

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const tx = await client.getTransaction(1);

    expect(tx.id).toBe(1);
    expect(tx.reference).toBe("ref_001");
    expect(tx.status).toBe("pending");
    expect(tx.callbackUrl).toBe("https://example.com/cb");
    expect(tx.paymentUrl).toBe("https://checkout.fedapay.com/pay/abc");
    expect(tx.createdAt).toBe("2026-01-01T00:00:00Z");
  });

  it("lève une erreur si la réponse est inattendue", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.getTransaction(1)).rejects.toThrow(
      "FedaPay getTransaction: unexpected response",
    );
  });

  it("lève une erreur HTTP", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ message: "Not found" }, 404));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.getTransaction(999)).rejects.toThrow("404");
  });
});

describe("FedaPayClient — listTransactions", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne la liste et les métadonnées", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        "v1/transactions": [TX_RAW],
        meta: { total: 1, per_page: 25, current_page: 1, total_pages: 1 },
      }),
    );

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const result = await client.listTransactions();

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].id).toBe(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.perPage).toBe(25);
    expect(result.meta.currentPage).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it("transmet les paramètres de pagination dans la query string", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ "v1/transactions": [], meta: {} }),
    );

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await client.listTransactions({ page: 2, perPage: 10 });

    const url = (mockFetch.mock.calls[0] as [string])[0];
    expect(url).toContain("/transactions/search");
    expect(url).toContain("page=2");
    expect(url).toContain("per_page=10");
  });

  it("lève une erreur si la réponse n'est pas un tableau", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.listTransactions()).rejects.toThrow(
      "FedaPay listTransactions: unexpected response",
    );
  });
});

describe("FedaPayClient — createPaymentToken", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne le token et le paymentUrl", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ token: "tok_abc", url: "https://checkout.fedapay.com/pay/tok_abc" }),
    );

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const result = await client.createPaymentToken(1);

    expect(result.token).toBe("tok_abc");
    expect(result.paymentUrl).toBe("https://checkout.fedapay.com/pay/tok_abc");
  });

  it("lève une erreur si token ou url est absent", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ token: "tok_abc" }));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.createPaymentToken(1)).rejects.toThrow(
      "FedaPay createPaymentToken: unexpected response",
    );
  });
});
