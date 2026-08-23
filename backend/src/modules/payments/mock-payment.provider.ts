import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CreatePaymentInput,
  CreatedPayment,
  PaymentProvider,
  RetrievedPayment,
} from './payment-provider.port';

/**
 * Development/test provider (PAYMENT_PROVIDER=mock): intents "succeed"
 * immediately. Lets the whole order pipeline be exercised end-to-end without
 * Stripe keys. NEVER selected when STRIPE_SECRET_KEY is configured.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    return {
      providerRef: `pi_mock_${randomUUID()}`,
      clientSecret: `cs_mock_${input.referenceId}`,
      status: 'succeeded', // mock: instantly paid
    };
  }

  async retrievePayment(_providerRef: string): Promise<RetrievedPayment> {
    return { status: 'succeeded', amountReceivedCents: 0 };
  }
}
