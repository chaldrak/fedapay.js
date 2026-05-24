export interface FedaPayConfig {
  secretKey: string;
  webhookSecret?: string;
  /** @default "sandbox" */
  environment?: "sandbox" | "live";
}

export interface CreateTransactionInput {
  amount: number;
  /** @default "XOF" */
  currency?: string;
  description: string;
  callbackUrl: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  metadata?: Record<string, string>;
}

export interface CreateTransactionResult {
  transactionId: string;
  paymentUrl: string;
}

export type TransactionStatus =
  | "pending"
  | "approved"
  | "declined"
  | "canceled"
  | "refunded"
  | "transferred";

export interface Transaction {
  id: number;
  reference: string;
  amount: number;
  status: TransactionStatus;
  description: string;
  callbackUrl: string | null;
  paymentUrl: string | null;
  mode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListTransactionsParams {
  page?: number;
  perPage?: number;
}

export interface ListMeta {
  total: number;
  perPage: number;
  currentPage: number;
  totalPages: number;
}

export interface ListTransactionsResult {
  transactions: Transaction[];
  meta: ListMeta;
}

export interface PaymentTokenResult {
  token: string;
  paymentUrl: string;
}

export interface PhoneNumber {
  number: string;
  /** Code pays ISO alpha-2, ex: "bj" pour le Bénin */
  country: string;
}

export interface CreateCustomerInput {
  firstname?: string;
  lastname?: string;
  email?: string;
  phoneNumber?: PhoneNumber;
}

export interface UpdateCustomerInput {
  firstname?: string;
  lastname?: string;
  email?: string;
  phoneNumber?: PhoneNumber;
}

export interface Customer {
  id: number;
  firstname: string;
  lastname: string;
  fullName: string;
  email: string | null;
  phoneNumberId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ListCustomersParams {
  page?: number;
  perPage?: number;
}

export interface ListCustomersResult {
  customers: Customer[];
  meta: ListMeta;
}

/** @internal */
export interface FedaPayCustomerResponse {
  id: number;
  firstname: string;
  lastname: string;
  full_name: string;
  email: string | null;
  phone_number_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Balance {
  id: number;
  amount: number;
  mode: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListBalancesResult {
  balances: Balance[];
  meta: ListMeta;
}

export interface Event {
  id: number;
  type: string;
  entity: Record<string, unknown>;
  objectId: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ListEventsParams {
  page?: number;
  perPage?: number;
}

export interface ListEventsResult {
  events: Event[];
  meta: ListMeta;
}

/** @internal */
export interface FedaPayBalanceResponse {
  id: number;
  amount: number;
  mode: string;
  account_id: number;
  created_at: string;
  updated_at: string;
}

/** @internal */
export interface FedaPayEventResponse {
  id: number;
  type: string;
  entity: Record<string, unknown>;
  object_id: number;
  account_id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type PayoutStatus =
  | "pending"
  | "scheduled"
  | "started"
  | "processing"
  | "sent"
  | "failed";

export type PayoutCustomerInput =
  | { id: number }
  | {
      email?: string;
      firstname?: string;
      lastname?: string;
      phoneNumber?: PhoneNumber;
    };

export interface CreatePayoutInput {
  amount: number;
  /** @default "XOF" */
  currency?: string;
  mode: string;
  customer: PayoutCustomerInput;
  metadata?: Record<string, string>;
  merchantReference?: string;
}

export interface SendPayoutItem {
  id: number | string;
  /** Passer "{now}" pour un envoi immédiat, ou une date ISO 8601 */
  scheduledAt?: string;
}

export interface Payout {
  id: number;
  reference: string;
  amount: number;
  status: PayoutStatus;
  mode: string;
  amountTransferred: number | null;
  amountDebited: number | null;
  commission: number | null;
  fees: number | null;
  merchantReference: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListPayoutsParams {
  page?: number;
  perPage?: number;
}

export interface ListPayoutsResult {
  payouts: Payout[];
  meta: ListMeta;
}

export interface CreateWebhookInput {
  url: string;
  enabled?: boolean;
  sslVerify?: boolean;
  disableOnError?: boolean;
}

export interface UpdateWebhookInput {
  url?: string;
  enabled?: boolean;
  sslVerify?: boolean;
  disableOnError?: boolean;
}

export interface Webhook {
  id: number;
  url: string;
  enabled: boolean;
  sslVerify: boolean;
  disableOnError: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListWebhooksParams {
  page?: number;
  perPage?: number;
}

export interface ListWebhooksResult {
  webhooks: Webhook[];
  meta: ListMeta;
}

/** @internal */
export interface FedaPayPayoutResponse {
  id: number;
  reference: string;
  amount: number;
  status: string;
  mode: string;
  amount_transferred: number | null;
  amount_debited: number | null;
  commission: number | null;
  fees: number | null;
  merchant_reference: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** @internal */
export interface FedaPayWebhookResponse {
  id: number;
  url: string;
  enabled: boolean;
  ssl_verify: boolean;
  disable_on_error: boolean;
  created_at: string;
  updated_at: string;
}

/** @internal */
export interface FedaPayTransactionResponse {
  id: number;
  reference: string;
  amount: number;
  status: string;
  description: string;
  callback_url: string | null;
  payment_url: string | null;
  mode: string | null;
  created_at: string;
  updated_at: string;
}
