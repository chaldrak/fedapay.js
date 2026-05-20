import { verifyWebhookSignature } from "./webhook.js";
import type {
  FedaPayConfig,
  CreateTransactionInput,
  CreateTransactionResult,
  FedaPayTransactionResponse,
  Transaction,
  ListTransactionsParams,
  ListTransactionsResult,
  PaymentTokenResult,
} from "./types.js";

function getBaseUrl(env: "sandbox" | "live"): string {
  return env === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";
}

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

export class FedaPayClient {
  readonly #secretKey: string;
  readonly #webhookSecret: string | undefined;
  readonly #baseUrl: string;

  constructor(config: FedaPayConfig) {
    if (!config.secretKey) {
      throw new Error("FedaPayClient: secretKey is required");
    }
    this.#secretKey = config.secretKey;
    this.#webhookSecret = config.webhookSecret;
    this.#baseUrl = getBaseUrl(config.environment ?? "sandbox");
  }

  async #request(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.#baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#secretKey}`,
        ...(init?.headers as Record<string, string> | undefined),
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `FedaPay ${init?.method ?? "GET"} ${path} failed: ${res.status} — ${body}`,
      );
    }

    return res.json() as Promise<Record<string, unknown>>;
  }

  #extractTransaction(data: Record<string, unknown>): FedaPayTransactionResponse | undefined {
    return (
      data["v1/transaction"] ??
      (data.v1 as Record<string, unknown> | undefined)?.transaction
    ) as FedaPayTransactionResponse | undefined;
  }

  async createTransaction(
    input: CreateTransactionInput,
  ): Promise<CreateTransactionResult> {
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

    const tx = this.#extractTransaction(data);

    if (!tx?.id) {
      throw new Error(
        `FedaPay createTransaction: unexpected response — ${JSON.stringify(data)}`,
      );
    }
    if (!tx.payment_url) {
      throw new Error(
        `FedaPay createTransaction: missing payment_url — ${JSON.stringify(data)}`,
      );
    }

    return { transactionId: String(tx.id), paymentUrl: tx.payment_url };
  }

  async getTransaction(id: number | string): Promise<Transaction> {
    const data = await this.#request(`/transactions/${id}`);
    const tx = this.#extractTransaction(data);

    if (!tx?.id) {
      throw new Error(
        `FedaPay getTransaction: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toTransaction(tx);
  }

  async listTransactions(params?: ListTransactionsParams): Promise<ListTransactionsResult> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.perPage !== undefined) qs.set("per_page", String(params.perPage));
    const query = qs.size > 0 ? `?${qs}` : "";

    const data = await this.#request(`/transactions${query}`);

    const txs = (
      data["v1/transactions"] ??
      (data.v1 as Record<string, unknown> | undefined)?.transactions
    ) as FedaPayTransactionResponse[] | undefined;

    if (!Array.isArray(txs)) {
      throw new Error(
        `FedaPay listTransactions: unexpected response — ${JSON.stringify(data)}`,
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
        `FedaPay createPaymentToken: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return { token, paymentUrl: url };
  }

  verifyWebhookSignature(rawBody: string, header: string): boolean {
    if (!this.#webhookSecret) {
      throw new Error(
        "FedaPayClient: webhookSecret is required to verify webhook signatures",
      );
    }
    return verifyWebhookSignature(rawBody, header, this.#webhookSecret);
  }
}
