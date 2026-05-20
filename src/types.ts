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

/** @internal */
export interface FedaPayTransactionResponse {
  id: number;
  reference: string;
  amount: number;
  status: string;
  payment_url: string;
}
