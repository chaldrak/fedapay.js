import type {
  CreateTransactionInput,
  CreateTransactionResult,
  FedaPayTransactionResponse,
  Transaction,
  ListTransactionsParams,
  ListTransactionsResult,
  PaymentTokenResult,
} from "../types.js";

type RequestFn = (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;

function toTransaction(tx: FedaPayTransactionResponse): Transaction {
  return {
    id: tx.id,
    reference: tx.reference,
    amount: tx.amount,
    status: tx.status as Transaction["status"],
    description: tx.description,
    callbackUrl: tx.callback_url ?? null,
    paymentUrl: tx.payment_url ?? null,
    mode: tx.mode ?? null,
    createdAt: tx.created_at,
    updatedAt: tx.updated_at,
  };
}

function extractTransaction(data: Record<string, unknown>): FedaPayTransactionResponse | undefined {
  return (
    data["v1/transaction"] ??
    (data.v1 as Record<string, unknown> | undefined)?.transaction
  ) as FedaPayTransactionResponse | undefined;
}

export class TransactionsResource {
  readonly #request: RequestFn;

  constructor(request: RequestFn) {
    this.#request = request;
  }

  async create(input: CreateTransactionInput): Promise<CreateTransactionResult> {
    const data = await this.#request("/transactions", {
      method: "POST",
      body: JSON.stringify({
        description: input.description,
        amount: input.amount,
        currency: { iso: input.currency ?? "XOF" },
        callback_url: input.callbackUrl,
        customer: {
          email: input.customerEmail,
          firstname: input.customerFirstName,
          lastname: input.customerLastName,
        },
        metadata: input.metadata,
      }),
    });

    const tx = extractTransaction(data);

    if (!tx?.id) {
      throw new Error(
        `FedaPay transactions.create: unexpected response — ${JSON.stringify(data)}`,
      );
    }
    if (!tx.payment_url) {
      throw new Error(
        `FedaPay transactions.create: missing payment_url — ${JSON.stringify(data)}`,
      );
    }

    return { transactionId: String(tx.id), paymentUrl: tx.payment_url };
  }

  async get(id: number | string): Promise<Transaction> {
    const data = await this.#request(`/transactions/${id}`);
    const tx = extractTransaction(data);

    if (!tx?.id) {
      throw new Error(
        `FedaPay transactions.get: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toTransaction(tx);
  }

  async list(params?: ListTransactionsParams): Promise<ListTransactionsResult> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.perPage !== undefined) qs.set("per_page", String(params.perPage));
    const query = qs.size > 0 ? `?${qs}` : "";

    const data = await this.#request(`/transactions/search${query}`);

    const txs = (
      data["v1/transactions"] ??
      (data.v1 as Record<string, unknown> | undefined)?.transactions
    ) as FedaPayTransactionResponse[] | undefined;

    if (!Array.isArray(txs)) {
      throw new Error(
        `FedaPay transactions.list: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    const rawMeta = (data.meta ?? {}) as {
      total?: number;
      per_page?: number;
      current_page?: number;
      total_pages?: number;
    };

    return {
      transactions: txs.map(toTransaction),
      meta: {
        total: rawMeta.total ?? 0,
        perPage: rawMeta.per_page ?? txs.length,
        currentPage: rawMeta.current_page ?? 1,
        totalPages: rawMeta.total_pages ?? 1,
      },
    };
  }

  async createPaymentToken(id: number | string): Promise<PaymentTokenResult> {
    const data = await this.#request(`/transactions/${id}/token`, {
      method: "POST",
    });

    const token = data.token as string | undefined;
    const url = data.url as string | undefined;

    if (!token || !url) {
      throw new Error(
        `FedaPay transactions.createPaymentToken: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return { token, paymentUrl: url };
  }
}
