import type {
  Event,
  FedaPayEventResponse,
  ListEventsParams,
  ListEventsResult,
  ListMeta,
} from "../types.js";

type RequestFn = (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;

function toEvent(e: FedaPayEventResponse): Event {
  return {
    id: e.id,
    type: e.type,
    entity: e.entity,
    objectId: e.object_id,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
    deletedAt: e.deleted_at ?? null,
  };
}

export class EventsResource {
  readonly #request: RequestFn;

  constructor(request: RequestFn) {
    this.#request = request;
  }

  async get(id: number | string): Promise<Event> {
    const data = await this.#request(`/events/${id}`);
    const event = (
      data["v1/event"] ??
      (data.v1 as Record<string, unknown> | undefined)?.event
    ) as FedaPayEventResponse | undefined;

    if (!event?.id) {
      throw new Error(
        `FedaPay events.get: unexpected response — ${JSON.stringify(data)}`,
      );
    }

    return toEvent(event);
  }

  async list(params?: ListEventsParams): Promise<ListEventsResult> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.perPage !== undefined) qs.set("per_page", String(params.perPage));
    const query = qs.size > 0 ? `?${qs}` : "";

    const data = await this.#request(`/events${query}`);

    const events = (
      data["v1/events"] ??
      (data.v1 as Record<string, unknown> | undefined)?.events
    ) as FedaPayEventResponse[] | undefined;

    if (!Array.isArray(events)) {
      throw new Error(
        `FedaPay events.list: unexpected response — ${JSON.stringify(data)}`,
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
      perPage: rawMeta.per_page ?? events.length,
      currentPage: rawMeta.current_page ?? 1,
      totalPages: rawMeta.total_pages ?? 1,
    };

    return { events: events.map(toEvent), meta };
  }
}
