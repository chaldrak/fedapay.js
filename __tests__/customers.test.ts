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

const CUSTOMER_RAW = {
  id: 10,
  firstname: "Jean",
  lastname: "Dupont",
  full_name: "Jean Dupont",
  email: "jean@example.com",
  phone_number_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

describe("FedaPayClient — customers.create", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne le customer mappé en camelCase", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/customer": CUSTOMER_RAW }, 201));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const customer = await client.customers.create({
      firstname: "Jean",
      lastname: "Dupont",
      email: "jean@example.com",
    });

    expect(customer.id).toBe(10);
    expect(customer.fullName).toBe("Jean Dupont");
    expect(customer.email).toBe("jean@example.com");
    expect(customer.deletedAt).toBeNull();
  });

  it("lève une erreur si la réponse est inattendue", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.customers.create({ email: "x@x.com" })).rejects.toThrow(
      "FedaPay customers.create: unexpected response",
    );
  });
});

describe("FedaPayClient — customers.get", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne le customer par son ID", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/customer": CUSTOMER_RAW }));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const customer = await client.customers.get(10);

    expect(customer.id).toBe(10);
    expect(customer.firstname).toBe("Jean");
  });

  it("lève une erreur HTTP 404", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ message: "Not found" }, 404));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.customers.get(999)).rejects.toThrow("404");
  });
});

describe("FedaPayClient — customers.list", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne la liste et les métadonnées", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        "v1/customers": [CUSTOMER_RAW],
        meta: { total: 1, per_page: 25, current_page: 1, total_pages: 1 },
      }),
    );

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const result = await client.customers.list();

    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].id).toBe(10);
    expect(result.meta.total).toBe(1);
  });

  it("transmet les paramètres de pagination", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/customers": [], meta: {} }));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await client.customers.list({ page: 2, perPage: 10 });

    const url = (mockFetch.mock.calls[0] as [string])[0];
    expect(url).toContain("/customers/search");
    expect(url).toContain("page=2");
    expect(url).toContain("per_page=10");
  });
});

describe("FedaPayClient — customers.update", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("retourne le customer mis à jour", async () => {
    const updated = { ...CUSTOMER_RAW, lastname: "Martin", full_name: "Jean Martin" };
    mockFetch.mockResolvedValueOnce(mockResponse({ "v1/customer": updated }));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    const customer = await client.customers.update(10, { lastname: "Martin" });

    expect(customer.lastname).toBe("Martin");
    expect(customer.fullName).toBe("Jean Martin");
  });
});

describe("FedaPayClient — customers.delete", () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it("résout sans erreur sur 204", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(null, 204));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.customers.delete(10)).resolves.toBeUndefined();
  });

  it("lève une erreur HTTP 404", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ message: "Not found" }, 404));

    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    await expect(client.customers.delete(999)).rejects.toThrow("404");
  });
});
