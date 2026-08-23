export type ProviderPaymentStatus =
  | 'requires_payment_method'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface CreatePaymentInput {
  amountCents: number;
  currency: string;
  /** Our order id / number — goes to the provider metadata for support. */
  referenceId: string;
  /** Stable key so provider-side retries never double-create intents. */
  idempotencyKey: string;
  description?: string;
}

export interface CreatedPayment {
  providerRef: string;
  clientSecret?: string;
  status: ProviderPaymentStatus;
}

export interface RetrievedPayment {
  status: ProviderPaymentStatus;
  amountReceivedCents?: number;
}

/**
 * §14.1 — OrdersService depends on this port only. Adding a provider means a
 * new adapter + webhook route; zero order-logic changes.
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  retrievePayment(providerRef: string): Promise<RetrievedPayment>;
}

/** DI token for the active provider adapter. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
