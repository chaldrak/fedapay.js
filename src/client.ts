import { verifyWebhookSignature } from "./webhook.js";
import { TransactionsResource } from "./resources/transactions.js";
import { CustomersResource } from "./resources/customers.js";
import { BalancesResource } from "./resources/balances.js";
import { EventsResource } from "./resources/events.js";
import { PayoutsResource } from "./resources/payouts.js";
import { WebhooksResource } from "./resources/webhooks.js";
import type { FedaPayConfig } from "./types.js";

function getBaseUrl(env: "sandbox" | "live"): string {
  return env === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";
}

export class FedaPayClient {
  readonly #secretKey: string;
  readonly #webhookSecret: string | undefined;
  readonly #baseUrl: string;
  readonly transactions: TransactionsResource;
  readonly customers: CustomersResource;
  readonly balances: BalancesResource;
  readonly events: EventsResource;
  readonly payouts: PayoutsResource;
  readonly webhooks: WebhooksResource;

  constructor(config: FedaPayConfig) {
    if (!config.secretKey) {
      throw new Error("FedaPayClient: secretKey is required");
    }
    this.#secretKey = config.secretKey;
    this.#webhookSecret = config.webhookSecret;
    this.#baseUrl = getBaseUrl(config.environment ?? "sandbox");
    this.transactions = new TransactionsResource(this.#request.bind(this));
    this.customers = new CustomersResource(this.#request.bind(this));
    this.balances = new BalancesResource(this.#request.bind(this));
    this.events = new EventsResource(this.#request.bind(this));
    this.payouts = new PayoutsResource(this.#request.bind(this));
    this.webhooks = new WebhooksResource(this.#request.bind(this));
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

    if (res.status === 204) return {};
    return res.json() as Promise<Record<string, unknown>>;
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
