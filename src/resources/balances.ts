import type {
  Balance,
  FedaPayBalanceResponse,
  ListBalancesResult,
  ListMeta,
} from "../types.js";

type RequestFn = (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;

function toBalance(b: FedaPayBalanceResponse): Balance {
  return {
    id: b.id,
    amount: b.amount,
    mode: b.mode,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

export class BalancesResource {
  readonly #request: RequestFn;

  constructor(request: RequestFn) {
    this.#request = request;
  }

  async get(id: number | string): Promise<Balance> {
    const data = await this.#request(`/balances/${id}`);
    const balance = (
      data["v1/balance"] ??
      (data.v1 as Record<string, unknown> | undefined)?.balance
    ) as FedaPayBalanceResponse | undefined;

    if (!balance?.id) {
      throw new Error(
        `FedaPay balances.get: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toBalance(balance);
  }

  async list(): Promise<ListBalancesResult> {
    const data = await this.#request("/balances");

    const balances = (
      data["v1/balances"] ??
      (data.v1 as Record<string, unknown> | undefined)?.balances
    ) as FedaPayBalanceResponse[] | undefined;

    if (!Array.isArray(balances)) {
      throw new Error(
        `FedaPay balances.list: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    const rawMeta = (data.meta ?? {}) as {
      total?: number;
      per_page?: number;
      current_page?: number;
      total_pages?: number;
    };

    const meta: ListMeta = {
      total: rawMeta.total ?? balances.length,
      perPage: rawMeta.per_page ?? balances.length,
      currentPage: rawMeta.current_page ?? 1,
      totalPages: rawMeta.total_pages ?? 1,
    };

    return { balances: balances.map(toBalance), meta };
  }
}
