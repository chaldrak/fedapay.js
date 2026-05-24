import type {
  CreatePayoutInput,
  FedaPayPayoutResponse,
  ListPayoutsParams,
  ListPayoutsResult,
  ListMeta,
  Payout,
  PayoutStatus,
  SendPayoutItem,
} from "../types.js";

type RequestFn = (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;

function toPayout(p: FedaPayPayoutResponse): Payout {
  return {
    id: p.id,
    reference: p.reference,
    amount: p.amount,
    status: p.status as PayoutStatus,
    mode: p.mode,
    amountTransferred: p.amount_transferred ?? null,
    amountDebited: p.amount_debited ?? null,
    commission: p.commission ?? null,
    fees: p.fees ?? null,
    merchantReference: p.merchant_reference ?? null,
    scheduledAt: p.scheduled_at ?? null,
    sentAt: p.sent_at ?? null,
    failedAt: p.failed_at ?? null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function extractPayout(data: Record<string, unknown>): FedaPayPayoutResponse | undefined {
  return (
    data["v1/payout"] ??
    (data.v1 as Record<string, unknown> | undefined)?.payout
  ) as FedaPayPayoutResponse | undefined;
}

function buildCustomer(customer: CreatePayoutInput["customer"]): Record<string, unknown> {
  if ("id" in customer) return { id: customer.id };
  const c: Record<string, unknown> = {};
  if (customer.email !== undefined) c.email = customer.email;
  if (customer.firstname !== undefined) c.firstname = customer.firstname;
  if (customer.lastname !== undefined) c.lastname = customer.lastname;
  if (customer.phoneNumber !== undefined) {
    c.phone_number = { number: customer.phoneNumber.number, country: customer.phoneNumber.country };
  }
  return c;
}

export class PayoutsResource {
  readonly #request: RequestFn;

  constructor(request: RequestFn) {
    this.#request = request;
  }

  async create(input: CreatePayoutInput): Promise<Payout> {
    const data = await this.#request("/payouts", {
      method: "POST",
      body: JSON.stringify({
        amount: input.amount,
        currency: { iso: input.currency ?? "XOF" },
        mode: input.mode,
        customer: buildCustomer(input.customer),
        metadata: input.metadata,
        merchant_reference: input.merchantReference,
      }),
    });

    const payout = extractPayout(data);
    if (!payout?.id) {
      throw new Error(
        `FedaPay payouts.create: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toPayout(payout);
  }

  async get(id: number | string): Promise<Payout> {
    const data = await this.#request(`/payouts/${id}`);
    const payout = extractPayout(data);

    if (!payout?.id) {
      throw new Error(
        `FedaPay payouts.get: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toPayout(payout);
  }

  async list(params?: ListPayoutsParams): Promise<ListPayoutsResult> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.perPage !== undefined) qs.set("per_page", String(params.perPage));
    const query = qs.size > 0 ? `?${qs}` : "";

    const data = await this.#request(`/payouts/search${query}`);

    const payouts = (
      data["v1/payouts"] ??
      (data.v1 as Record<string, unknown> | undefined)?.payouts
    ) as FedaPayPayoutResponse[] | undefined;

    if (!Array.isArray(payouts)) {
      throw new Error(
        `FedaPay payouts.list: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    const rawMeta = (data.meta ?? {}) as {
      total?: number;
      per_page?: number;
      current_page?: number;
      total_pages?: number;
    };

    const meta: ListMeta = {
      total: rawMeta.total ?? 0,
      perPage: rawMeta.per_page ?? payouts.length,
      currentPage: rawMeta.current_page ?? 1,
      totalPages: rawMeta.total_pages ?? 1,
    };

    return { payouts: payouts.map(toPayout), meta };
  }

  async send(items: SendPayoutItem[]): Promise<void> {
    await this.#request("/payouts/start", {
      method: "PUT",
      body: JSON.stringify({
        payouts: items.map((item) => ({
          id: item.id,
          ...(item.scheduledAt !== undefined ? { scheduled_at: item.scheduledAt } : {}),
        })),
      }),
    });
  }
}
