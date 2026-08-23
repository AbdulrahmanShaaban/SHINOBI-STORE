import {
  PaymentReconService,
  retrieveWithTimeout,
} from './payment-recon.service';

/**
 * §17 reconciliation mapping logic with mocked provider + prisma + orders.
 * Proves: succeeded → confirmByProviderRef, failed/canceled → marked failed
 * with reason 'reconciliation', still-pending rows skipped, and one bad row
 * never kills the sweep.
 */

interface Harness {
  service: PaymentReconService;
  prisma: { payment: { findMany: jest.Mock } };
  provider: { retrievePayment: jest.Mock };
  orders: {
    confirmByProviderRef: jest.Mock;
    failPaymentByProviderRef: jest.Mock;
  };
}

const REF = 'pi_test_1';

function make(rows: { providerRef: string }[]): Harness {
  const prisma = { payment: { findMany: jest.fn().mockResolvedValue(rows) } };
  const provider = { retrievePayment: jest.fn().mockResolvedValue({ status: 'requires_payment_method' }) };
  const orders = {
    confirmByProviderRef: jest.fn().mockResolvedValue(undefined),
    failPaymentByProviderRef: jest.fn().mockResolvedValue(undefined),
  };
  const service = new PaymentReconService(
    prisma as never,
    provider as never,
    orders as never,
  );
  return { service, prisma, provider, orders };
}

describe('PaymentReconService.runOnce', () => {
  it('selects only stale pending-ish payments', async () => {
    const h = make([]);
    await h.service.runOnce(new Date('2026-08-23T12:00:00Z'));

    expect(h.prisma.payment.findMany).toHaveBeenCalledTimes(1);
    const arg = h.prisma.payment.findMany.mock.calls[0][0];
    expect(arg.where.status.in).toEqual([
      'requires_payment_method',
      'requires_action',
      'processing',
    ]);
    expect(arg.where.createdAt.lt.toISOString()).toBe('2026-08-23T11:45:00.000Z'); // 15 min stale window
  });

  it('confirms the order when provider truth is succeeded', async () => {
    const h = make([{ providerRef: REF }]);
    h.provider.retrievePayment.mockResolvedValue({ status: 'succeeded' });

    const summary = await h.service.runOnce();

    expect(h.orders.confirmByProviderRef).toHaveBeenCalledWith(REF);
    expect(h.orders.failPaymentByProviderRef).not.toHaveBeenCalled();
    expect(summary).toEqual({ checked: 1, confirmed: 1, failed: 0 });
  });

  it('marks the payment failed with reason reconciliation when provider says failed', async () => {
    const h = make([{ providerRef: REF }]);
    h.provider.retrievePayment.mockResolvedValue({ status: 'failed' });

    const summary = await h.service.runOnce();

    expect(h.orders.failPaymentByProviderRef).toHaveBeenCalledWith(REF, 'reconciliation');
    expect(h.orders.confirmByProviderRef).not.toHaveBeenCalled();
    expect(summary).toEqual({ checked: 1, confirmed: 0, failed: 1 });
  });

  it('marks the payment failed when the provider canceled the intent', async () => {
    const h = make([{ providerRef: REF }]);
    h.provider.retrievePayment.mockResolvedValue({ status: 'canceled' });

    const summary = await h.service.runOnce();

    expect(h.orders.failPaymentByProviderRef).toHaveBeenCalledWith(REF, 'reconciliation');
    expect(summary.failed).toBe(1);
  });

  it('leaves still-pending provider states untouched', async () => {
    const h = make([{ providerRef: REF }]);
    h.provider.retrievePayment.mockResolvedValue({ status: 'requires_action' });

    const summary = await h.service.runOnce();

    expect(h.orders.confirmByProviderRef).not.toHaveBeenCalled();
    expect(h.orders.failPaymentByProviderRef).not.toHaveBeenCalled();
    expect(summary).toEqual({ checked: 1, confirmed: 0, failed: 0 });
  });

  it('keeps sweeping when one row blows up (provider error)', async () => {
    const h = make([{ providerRef: 'pi_bad' }, { providerRef: 'pi_good' }]);
    h.provider.retrievePayment.mockImplementation((ref: string) =>
      ref === 'pi_bad'
        ? Promise.reject(new Error('provider exploded'))
        : Promise.resolve({ status: 'succeeded' }),
    );

    const summary = await h.service.runOnce();

    expect(h.provider.retrievePayment).toHaveBeenCalledTimes(2);
    expect(h.orders.confirmByProviderRef).toHaveBeenCalledWith('pi_good');
    expect(summary).toEqual({ checked: 2, confirmed: 1, failed: 0 });
  });

  it('keeps sweeping when confirmation itself fails mid-row', async () => {
    const h = make([{ providerRef: 'pi_conflict' }, { providerRef: 'pi_ok' }]);
    h.provider.retrievePayment.mockResolvedValue({ status: 'succeeded' });
    h.orders.confirmByProviderRef.mockImplementation((ref: string) =>
      ref === 'pi_conflict'
        ? Promise.reject(new Error('illegal transition'))
        : Promise.resolve(undefined),
    );

    const summary = await h.service.runOnce();

    expect(h.orders.confirmByProviderRef).toHaveBeenCalledTimes(2);
    expect(summary.confirmed).toBe(1);
  });
});

describe('retrieveWithTimeout', () => {
  it('passes through fast provider responses', async () => {
    const result = await retrieveWithTimeout(
      async () => ({ status: 'succeeded' }),
      8_000,
    );
    expect(result.status).toBe('succeeded');
  });

  it('rejects when the provider call exceeds the deadline', async () => {
    jest.useFakeTimers();
    try {
      const hung = new Promise<{ status: string }>(() => undefined);
      let caught: Error | undefined;
      const guarded = retrieveWithTimeout(() => hung, 100).catch(
        (err: Error) => {
          caught = err;
          return { status: 'rejected' };
        },
      );
      await jest.advanceTimersByTimeAsync(150);
      await guarded;
      expect(caught?.message).toContain('timeout');
    } finally {
      jest.useRealTimers();
    }
  });
});
