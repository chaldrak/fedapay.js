import { verifyWebhookSignature } from "./webhook.js";
import type {
  FedaPayConfig,
  CreateTransactionInput,
  CreateTransactionResult,
  FedaPayTransactionResponse,
} from "./types.js";

function getBaseUrl(env: "sandbox" | "live"): string {
  return env === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";
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

  async createTransaction(
    input: CreateTransactionInput,
  ): Promise<CreateTransactionResult> {
    const res = await fetch(`${this.#baseUrl}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#secretKey}`,
      },
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

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `FedaPay createTransaction failed: ${res.status} — ${body}`,
      );
    }

    const data = (await res.json()) as Record<string, unknown>;
    const tx = (
      data["v1/transaction"] ??
      (data.v1 as Record<string, unknown> | undefined)?.transaction
    ) as FedaPayTransactionResponse | undefined;

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

  verifyWebhookSignature(rawBody: string, header: string): boolean {
    if (!this.#webhookSecret) {
      throw new Error(
        "FedaPayClient: webhookSecret is required to verify webhook signatures",
      );
    }
    return verifyWebhookSignature(rawBody, header, this.#webhookSecret);
  }
}
