import { Global, Module } from '@nestjs/common';
import { StripeAdapter } from './stripe.adapter';
import { MockPaymentProvider } from './mock-payment.provider';
import { DemoPaymentProvider } from './demo-payment.provider';
import { DemoPaymentsController } from './demo-payments.controller';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.port';
import { OrdersModule } from '../orders/orders.module';

/**
 * Provider selection at boot (priority order):
 *  1. PAYMENT_PROVIDER=demo  → DemoPaymentProvider (test cards, simulated gateway)
 *  2. PAYMENT_PROVIDER=mock  → MockPaymentProvider (instant success, unit tests)
 *  3. STRIPE_SECRET_KEY set  → StripeAdapter (real Stripe)
 *  4. Fallback               → MockPaymentProvider
 */
@Global()
@Module({
  imports: [OrdersModule],
  controllers: [DemoPaymentsController],
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (): PaymentProvider => {
        const explicit = process.env.PAYMENT_PROVIDER?.toLowerCase();
        if (explicit === 'demo') return new DemoPaymentProvider();
        if (explicit === 'mock') return new MockPaymentProvider();
        const key = process.env.STRIPE_SECRET_KEY;
        if (key) return new StripeAdapter(key);
        return new MockPaymentProvider();
      },
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
