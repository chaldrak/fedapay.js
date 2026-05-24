import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  Customer,
  FedaPayCustomerResponse,
  ListCustomersParams,
  ListCustomersResult,
} from "../types.js";

type RequestFn = (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;

function toCustomer(c: FedaPayCustomerResponse): Customer {
  return {
    id: c.id,
    firstname: c.firstname,
    lastname: c.lastname,
    fullName: c.full_name,
    email: c.email ?? null,
    phoneNumberId: c.phone_number_id ?? null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    deletedAt: c.deleted_at ?? null,
  };
}

function extractCustomer(data: Record<string, unknown>): FedaPayCustomerResponse | undefined {
  return (
    data["v1/customer"] ??
    (data.v1 as Record<string, unknown> | undefined)?.customer
  ) as FedaPayCustomerResponse | undefined;
}

function buildBody(input: CreateCustomerInput | UpdateCustomerInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.firstname !== undefined) body.firstname = input.firstname;
  if (input.lastname !== undefined) body.lastname = input.lastname;
  if (input.email !== undefined) body.email = input.email;
  if (input.phoneNumber !== undefined) {
    body.phone_number = { number: input.phoneNumber.number, country: input.phoneNumber.country };
  }
  return body;
}

export class CustomersResource {
  readonly #request: RequestFn;

  constructor(request: RequestFn) {
    this.#request = request;
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const data = await this.#request("/customers", {
      method: "POST",
      body: JSON.stringify(buildBody(input)),
    });

    const customer = extractCustomer(data);
    if (!customer?.id) {
      throw new Error(
        `FedaPay customers.create: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toCustomer(customer);
  }

  async get(id: number | string): Promise<Customer> {
    const data = await this.#request(`/customers/${id}`);
    const customer = extractCustomer(data);

    if (!customer?.id) {
      throw new Error(
        `FedaPay customers.get: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toCustomer(customer);
  }

  async list(params?: ListCustomersParams): Promise<ListCustomersResult> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.perPage !== undefined) qs.set("per_page", String(params.perPage));
    const query = qs.size > 0 ? `?${qs}` : "";

    const data = await this.#request(`/customers/search${query}`);

    const customers = (
      data["v1/customers"] ??
      (data.v1 as Record<string, unknown> | undefined)?.customers
    ) as FedaPayCustomerResponse[] | undefined;

    if (!Array.isArray(customers)) {
      throw new Error(
        `FedaPay customers.list: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    const rawMeta = (data.meta ?? {}) as {
      total?: number;
      per_page?: number;
      current_page?: number;
      total_pages?: number;
    };

    return {
      customers: customers.map(toCustomer),
      meta: {
        total: rawMeta.total ?? 0,
        perPage: rawMeta.per_page ?? customers.length,
        currentPage: rawMeta.current_page ?? 1,
        totalPages: rawMeta.total_pages ?? 1,
      },
    };
  }

  async update(id: number | string, input: UpdateCustomerInput): Promise<Customer> {
    const data = await this.#request(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(buildBody(input)),
    });

    const customer = extractCustomer(data);
    if (!customer?.id) {
      throw new Error(
        `FedaPay customers.update: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toCustomer(customer);
  }

  async delete(id: number | string): Promise<void> {
    await this.#request(`/customers/${id}`, { method: "DELETE" });
  }
}
