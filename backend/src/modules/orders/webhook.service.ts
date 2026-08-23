import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrdersService } from './orders.service';
import { StripeAdapter } from '../payments/stripe.adapter';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment-provider.port';

/**
 * §13.2 webhook pipeline.
 * - Signature verification on the RAW body (forged → 400).
 * - eventId unique → duplicate deliveries acked without state change.
 * - Handlers are idempotent: the order state machine no-ops stale transitions.
 * - Handler crash mid-event leaves processingError on the row for reprocess.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly stripe: StripeAdapter | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    @Inject(PAYMENT_PROVIDER) paymentProvider: PaymentProvider,
  ) {
    this.stripe = paymentProvider instanceof StripeAdapter ? paymentProvider : null;
  }

  async handleStripeWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<{ handled: boolean; deduped?: boolean; error?: string }> {
    if (!this.stripe) return { handled: false, error: 'stripe not configured' };
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!rawBody || !signature || !secret) {
      throw new Error('missing webhook payload or signature');
    }

    let event: { id: string; type: string; data: { object: Record<string, unknown> } };
    try {
      event = this.stripe.constructEvent(rawBody, signature, secret) as unknown as typeof event;
    } catch (err) {
      this.logger.warn({ err: (err as Error).message }, 'webhook signature verification failed');
      throw err;
    }

    // Dedupe first — insert wins the unique(eventId); losers skip processing.
    try {
      await this.prisma.webhookEvent.create({
        data: { provider: 'stripe', eventId: event.id, type: event.type, payload: event as never },
      });
    } catch {
      this.logger.debug({ eventId: event.id }, 'duplicate webhook delivery ignored');
      return { handled: true, deduped: true };
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const ref = String(event.data.object.id);
          await this.orders.confirmByProviderRef(ref);
          break;
        }
        case 'payment_intent.payment_failed': {
          const ref = String(event.data.object.id);
          await this.orders.failPaymentByProviderRef(
            ref,
            String((event.data.object.last_payment_error as { message?: string } | undefined)?.message ?? 'payment failed'),
          );
          break;
        }
        default:
          break; // unhandled types are stored but not acted upon
      }
      await this.prisma.webhookEvent.update({
        where: { eventId: event.id },
        data: { processedAt: new Date() },
      });
      return { handled: true };
    } catch (err) {
      await this.prisma.webhookEvent
        .update({ where: { eventId: event.id }, data: { processingError: (err as Error).message } })
        .catch(() => undefined);
      throw err;
    }
  }
}
