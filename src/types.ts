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
