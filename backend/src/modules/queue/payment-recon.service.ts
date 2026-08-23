import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { logger } from '../../common/logger/logger';
import { OrdersService } from '../orders/orders.service';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../payments/payment-provider.port';
import {
  RECON_PROVIDER_TIMEOUT_MS,
  RECON_STALE_AFTER_MS,
} from './queue.constants';

export interface PaymentReconSummary {
  checked: number;
  confirmed: number;
  failed: number;
}

/** Pending-ish payment rows that may have resolved provider-side unnoticed. */
const STALE_STATUSES = ['requires_payment_method', 'requires_action', 'processing'] as const;

/**
 * §17 payment-recon. Compares stale pending payments against provider truth:
 * succeeded → confirm the order (same idempotent path webhooks use);
 * failed/canceled → mark the payment failed with reason 'reconciliation'.
 * Every item is individually guarded (8s provider timeout, per-row try/catch)
 * so one bad row never kills the sweep; transitions are state-guarded, which
 * makes overlapping/repeatable runs safe.
 */
@Injectable()
export class PaymentReconService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    private readonly orders: OrdersService,
  ) {}

  async runOnce(now = new Date()): Promise<PaymentReconSummary> {
    const staleBefore = new Date(now.getTime() - RECON_STALE_AFTER_MS);
    logger.info({ staleBefore: staleBefore.toISOString() }, 'payment-recon start');

    const rows = await this.prisma.payment.findMany({
      where: { status: { in: [...STALE_STATUSES] }, createdAt: { lt: staleBefore } },
      select: { providerRef: true },
    });

    let confirmed = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const truth = await retrieveWithTimeout(
          () => this.paymentProvider.retrievePayment(row.providerRef),
          RECON_PROVIDER_TIMEOUT_MS,
        );
        switch (truth.status) {
          case 'succeeded':
            await this.orders.confirmByProviderRef(row.providerRef);
            confirmed += 1;
            break;
          case 'failed':
          case 'canceled':
            await this.orders.failPaymentByProviderRef(row.providerRef, 'reconciliation');
            failed += 1;
            break;
          default:
            // Still pending provider-side — nothing to reconcile yet.
            break;
        }
      } catch (err) {
        logger.warn(
          { err: (err as Error).message, providerRef: row.providerRef },
          'payment-recon row error',
        );
      }
    }

    const summary: PaymentReconSummary = { checked: rows.length, confirmed, failed };
    logger.info(summary, 'payment-recon end');
    return summary;
  }
}

/**
 * Provider call bounded at `ms`: a hung adapter must not stall the sweep past
 * its repeatable cadence. Promise.race keeps both rejections handled — a late
 * settlement of the losing branch is absorbed by the race and never surfaces
 * as an unhandled rejection.
 */
export function retrieveWithTimeout<T>(
  call: () => Promise<T>,
  ms: number,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`provider timeout after ${ms}ms`)), ms);
    timer.unref?.();
  });
  return Promise.race([call(), timeout]).finally(() => clearTimeout(timer));
}
