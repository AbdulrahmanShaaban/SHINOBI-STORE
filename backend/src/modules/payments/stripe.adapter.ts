import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  CreatePaymentInput,
  CreatedPayment,
  PaymentProvider,
  ProviderPaymentStatus,
  RetrievedPayment,
} from './payment-provider.port';

const CREATE_TIMEOUT_MS = 8_000; // §13.1: explicit timeout at PI creation

/**
 * §14.1 Stripe adapter. Server-side amount authority: the intent is created
 * with OUR computed total, never anything client-supplied.
 */
@Injectable()
export class StripeAdapter implements PaymentProvider {
  readonly name = 'stripe';
  private readonly logger = new Logger(StripeAdapter.name);
  private readonly stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const intent = await this.withTimeout(
      this.stripe.paymentIntents.create(
        {
          amount: input.amountCents,
          currency: input.currency.toLowerCase(),
          automatic_payment_methods: { enabled: true },
          metadata: { orderReference: input.referenceId },
        },
        { idempotencyKey: input.idempotencyKey },
      ),
      CREATE_TIMEOUT_MS,
      'paymentIntent.create',
    );

    return {
      providerRef: intent.id,
      clientSecret: intent.client_secret ?? undefined,
      status: this.mapStatus(intent.status),
    };
  }

  async retrievePayment(providerRef: string): Promise<RetrievedPayment> {
    const intent = await this.withTimeout(
      this.stripe.paymentIntents.retrieve(providerRef),
      CREATE_TIMEOUT_MS,
      'paymentIntent.retrieve',
    );
    return {
      status: this.mapStatus(intent.status),
      amountReceivedCents: intent.amount_received,
    };
  }

  /** Verifies signature on the RAW body — never on re-serialized JSON. */
  constructEvent(rawBody: Buffer, signature: string, webhookSecret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  private mapStatus(status: Stripe.PaymentIntent.Status): ProviderPaymentStatus {
    switch (status) {
      case 'succeeded':
        return 'succeeded';
      case 'requires_action':
      case 'requires_confirmation':
        return 'requires_action';
      case 'processing':
        return 'processing';
      case 'canceled':
        return 'canceled';
      default:
        return 'requires_payment_method';
    }
  }

  private async withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms);
    });
    try {
      return await Promise.race([p, timeout]);
    } catch (err) {
      this.logger.error({ err: (err as Error).message }, `stripe ${what} failed`);
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
