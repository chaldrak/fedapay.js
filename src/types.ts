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
