import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  FedaPayWebhookResponse,
  ListWebhooksParams,
  ListWebhooksResult,
  ListMeta,
  Webhook,
} from "../types.js";

type RequestFn = (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;

function toWebhook(w: FedaPayWebhookResponse): Webhook {
  return {
    id: w.id,
    url: w.url,
    enabled: w.enabled,
    sslVerify: w.ssl_verify,
    disableOnError: w.disable_on_error,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

function extractWebhook(data: Record<string, unknown>): FedaPayWebhookResponse | undefined {
  return (
    data["v1/webhook"] ??
    (data.v1 as Record<string, unknown> | undefined)?.webhook
  ) as FedaPayWebhookResponse | undefined;
}

function buildBody(input: CreateWebhookInput | UpdateWebhookInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.url !== undefined) body.url = input.url;
  if (input.enabled !== undefined) body.enabled = input.enabled;
  if (input.sslVerify !== undefined) body.ssl_verify = input.sslVerify;
  if (input.disableOnError !== undefined) body.disable_on_error = input.disableOnError;
  return body;
}

export class WebhooksResource {
  readonly #request: RequestFn;

  constructor(request: RequestFn) {
    this.#request = request;
  }

  async create(input: CreateWebhookInput): Promise<Webhook> {
    const data = await this.#request("/webhooks", {
      method: "POST",
      body: JSON.stringify(buildBody(input)),
    });

    const webhook = extractWebhook(data);
    if (!webhook?.id) {
      throw new Error(
        `FedaPay webhooks.create: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toWebhook(webhook);
  }

  async get(id: number | string): Promise<Webhook> {
    const data = await this.#request(`/webhooks/${id}`);
    const webhook = extractWebhook(data);

    if (!webhook?.id) {
      throw new Error(
        `FedaPay webhooks.get: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toWebhook(webhook);
  }

  async list(params?: ListWebhooksParams): Promise<ListWebhooksResult> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.perPage !== undefined) qs.set("per_page", String(params.perPage));
    const query = qs.size > 0 ? `?${qs}` : "";

    const data = await this.#request(`/webhooks${query}`);

    const webhooks = (
      data["v1/webhooks"] ??
      (data.v1 as Record<string, unknown> | undefined)?.webhooks
    ) as FedaPayWebhookResponse[] | undefined;

    if (!Array.isArray(webhooks)) {
      throw new Error(
        `FedaPay webhooks.list: unexpected response — ${JSON.stringify(data)}`,
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
      perPage: rawMeta.per_page ?? webhooks.length,
      currentPage: rawMeta.current_page ?? 1,
      totalPages: rawMeta.total_pages ?? 1,
    };

    return { webhooks: webhooks.map(toWebhook), meta };
  }

  async update(id: number | string, input: UpdateWebhookInput): Promise<Webhook> {
    const data = await this.#request(`/webhooks/${id}`, {
      method: "PUT",
      body: JSON.stringify(buildBody(input)),
    });

    const webhook = extractWebhook(data);
    if (!webhook?.id) {
      throw new Error(
        `FedaPay webhooks.update: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toWebhook(webhook);
  }

  async delete(id: number | string): Promise<void> {
    await this.#request(`/webhooks/${id}`, { method: "DELETE" });
  }
}
