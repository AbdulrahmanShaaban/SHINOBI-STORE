import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CreatePaymentInput,
  CreatedPayment,
  PaymentProvider,
  ProviderPaymentStatus,
  RetrievedPayment,
} from './payment-provider.port';

const PROCESSING_DELAY_MS = 1_800;

export type DemoPaymentState =
  | 'requires_payment_method'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'requires_action';

export interface DemoPaymentIntent {
  providerRef: string;
  clientSecret: string;
  state: DemoPaymentState;
  amountCents: number;
  currency: string;
  referenceId: string;
  createdAt: number;
}

export interface DemoCardResult {
  outcome: 'succeeded' | 'failed' | 'requires_action';
  message?: string;
}

const TEST_CARDS: Record<string, DemoCardResult> = {
  '4242424242424242': { outcome: 'succeeded' },
  '4000000000000002': { outcome: 'failed', message: 'Card declined by issuer' },
  '4000002500003155': { outcome: 'requires_action', message: 'Additional authentication required' },
};

function stripSpaces(card: string): string {
  return card.replace(/\s+/g, '');
}

/**
 * Demo payment provider — simulates a real payment gateway for development.
 * Uses test card numbers to control outcomes. Never stores real card data.
 *
 * State machine:
 *   requires_payment_method → processing → succeeded | failed | requires_action
 *
 * Idempotency: duplicate clientSecret lookups return the same intent.
 */
@Injectable()
export class DemoPaymentProvider implements PaymentProvider {
  readonly name = 'demo';
  private readonly logger = new Logger(DemoPaymentProvider.name);

  private readonly intents = new Map<string, DemoPaymentIntent>();

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const providerRef = `demo_pi_${randomUUID()}`;
    const clientSecret = `demo_cs_${randomUUID()}`;

    const intent: DemoPaymentIntent = {
      providerRef,
      clientSecret,
      state: 'requires_payment_method',
      amountCents: input.amountCents,
      currency: input.currency,
      referenceId: input.referenceId,
      createdAt: Date.now(),
    };

    this.intents.set(clientSecret, intent);
    this.intents.set(providerRef, intent);

    this.logger.debug(
      { providerRef, clientSecret, amountCents: input.amountCents },
      'demo payment intent created',
    );

    return {
      providerRef,
      clientSecret,
      status: 'requires_payment_method',
    };
  }

  async retrievePayment(providerRef: string): Promise<RetrievedPayment> {
    const intent = this.intents.get(providerRef);
    if (!intent) {
      return { status: 'canceled' };
    }
    return {
      status: intent.state,
      amountReceivedCents: intent.state === 'succeeded' ? intent.amountCents : undefined,
    };
  }

  /**
   * Process a card submission against the demo provider.
   * Determines outcome based on the card number, then transitions state
   * through processing → final state with realistic delay.
   */
  async processCardSubmission(
    clientSecret: string,
    card: { number: string; expMonth: number; expYear: number; cvc: string },
  ): Promise<{ status: DemoPaymentState; providerRef: string; message?: string }> {
    const intent = this.intents.get(clientSecret);
    if (!intent) {
      throw new Error('Invalid or expired client secret');
    }

    if (intent.state !== 'requires_payment_method') {
      return { status: intent.state, providerRef: intent.providerRef };
    }

    const cardResult = this.evaluateCard(card.number);

    intent.state = 'processing';

    await this.delay(PROCESSING_DELAY_MS);

    if (cardResult.outcome === 'succeeded') {
      intent.state = 'succeeded';
      this.logger.debug({ providerRef: intent.providerRef }, 'demo payment succeeded');
    } else if (cardResult.outcome === 'failed') {
      intent.state = 'failed';
      this.logger.debug(
        { providerRef: intent.providerRef, reason: cardResult.message },
        'demo payment failed',
      );
    } else {
      intent.state = 'requires_action';
      this.logger.debug({ providerRef: intent.providerRef }, 'demo payment requires action');
    }

    return {
      status: intent.state,
      providerRef: intent.providerRef,
      message: cardResult.message,
    };
  }

  /**
   * Simulate completing a requires_action payment (e.g. 3DS authentication).
   */
  async completeAction(clientSecret: string): Promise<{ status: DemoPaymentState; providerRef: string }> {
    const intent = this.intents.get(clientSecret);
    if (!intent) {
      throw new Error('Invalid or expired client secret');
    }

    if (intent.state !== 'requires_action') {
      return { status: intent.state, providerRef: intent.providerRef };
    }

    intent.state = 'processing';
    await this.delay(1_200);
    intent.state = 'succeeded';

    return { status: 'succeeded', providerRef: intent.providerRef };
  }

  private evaluateCard(number: string): DemoCardResult {
    const stripped = stripSpaces(number);
    return TEST_CARDS[stripped] ?? { outcome: 'failed', message: 'Invalid card number' };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
