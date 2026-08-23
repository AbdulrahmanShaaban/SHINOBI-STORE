import { Global, Module } from '@nestjs/common';
import { StripeAdapter } from './stripe.adapter';
import { MockPaymentProvider } from './mock-payment.provider';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.port';

/**
 * Provider selection at boot: real Stripe when STRIPE_SECRET_KEY is present,
 * otherwise the mock (dev/test). OrdersService only knows the port token.
 */
@Global()
@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (): PaymentProvider => {
        const key = process.env.STRIPE_SECRET_KEY;
        if (key) return new StripeAdapter(key);
        return new MockPaymentProvider();
      },
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
