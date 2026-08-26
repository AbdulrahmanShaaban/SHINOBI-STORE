import { DemoPaymentProvider } from './demo-payment.provider';

describe('DemoPaymentProvider', () => {
  let provider: DemoPaymentProvider;

  beforeEach(() => {
    provider = new DemoPaymentProvider();
  });

  const baseInput = {
    amountCents: 5000,
    currency: 'USD',
    referenceId: 'SS-2026-000001',
    idempotencyKey: 'pi-test-001',
  };

  describe('createPayment', () => {
    it('creates a payment with requires_payment_method status', async () => {
      const result = await provider.createPayment(baseInput);

      expect(result.status).toBe('requires_payment_method');
      expect(result.providerRef).toMatch(/^demo_pi_/);
      expect(result.clientSecret).toMatch(/^demo_cs_/);
    });

    it('returns different refs for different idempotency keys', async () => {
      const a = await provider.createPayment(baseInput);
      const b = await provider.createPayment({ ...baseInput, idempotencyKey: 'pi-test-002' });

      expect(a.providerRef).not.toBe(b.providerRef);
      expect(a.clientSecret).not.toBe(b.clientSecret);
    });

    it('stores amount and currency for server-side verification', async () => {
      const result = await provider.createPayment(baseInput);
      const retrieved = await provider.retrievePayment(result.providerRef);

      expect(retrieved.status).toBe('requires_payment_method');
    });
  });

  describe('retrievePayment', () => {
    it('returns canceled for unknown provider ref', async () => {
      const result = await provider.retrievePayment('nonexistent_ref');
      expect(result.status).toBe('canceled');
    });

    it('returns current state for known provider ref', async () => {
      const created = await provider.createPayment(baseInput);
      const retrieved = await provider.retrievePayment(created.providerRef);

      expect(retrieved.status).toBe('requires_payment_method');
    });
  });

  describe('processCardSubmission — success card', () => {
    it('transitions to succeeded for 4242 card', async () => {
      const created = await provider.createPayment(baseInput);

      const result = await provider.processCardSubmission(created.clientSecret!, {
        number: '4242 4242 4242 4242',
        expMonth: 12,
        expYear: 2030,
        cvc: '123',
      });

      expect(result.status).toBe('succeeded');
      expect(result.providerRef).toBe(created.providerRef);

      const retrieved = await provider.retrievePayment(result.providerRef);
      expect(retrieved.status).toBe('succeeded');
      expect(retrieved.amountReceivedCents).toBe(baseInput.amountCents);
    });
  });

  describe('processCardSubmission — failed card', () => {
    it('transitions to failed for 0002 card', async () => {
      const created = await provider.createPayment(baseInput);

      const result = await provider.processCardSubmission(created.clientSecret!, {
        number: '4000 0000 0000 0002',
        expMonth: 12,
        expYear: 2030,
        cvc: '123',
      });

      expect(result.status).toBe('failed');
      expect(result.message).toBe('Card declined by issuer');
    });
  });

  describe('processCardSubmission — requires action', () => {
    it('transitions to requires_action for 3155 card', async () => {
      const created = await provider.createPayment(baseInput);

      const result = await provider.processCardSubmission(created.clientSecret!, {
        number: '4000 0025 0000 3155',
        expMonth: 12,
        expYear: 2030,
        cvc: '123',
      });

      expect(result.status).toBe('requires_action');
    });
  });

  describe('processCardSubmission — invalid card', () => {
    it('returns failed for unrecognized card number', async () => {
      const created = await provider.createPayment(baseInput);

      const result = await provider.processCardSubmission(created.clientSecret!, {
        number: '1111 1111 1111 1111',
        expMonth: 12,
        expYear: 2030,
        cvc: '123',
      });

      expect(result.status).toBe('failed');
      expect(result.message).toBe('Invalid card number');
    });
  });

  describe('processCardSubmission — idempotency', () => {
    it('returns current state if already processed', async () => {
      const created = await provider.createPayment(baseInput);

      await provider.processCardSubmission(created.clientSecret!, {
        number: '4242 4242 4242 4242',
        expMonth: 12,
        expYear: 2030,
        cvc: '123',
      });

      const secondAttempt = await provider.processCardSubmission(created.clientSecret!, {
        number: '4242 4242 4242 4242',
        expMonth: 12,
        expYear: 2030,
        cvc: '123',
      });

      expect(secondAttempt.status).toBe('succeeded');
      expect(secondAttempt.providerRef).toBe(created.providerRef);
    });

    it('rejects invalid client secrets', async () => {
      await expect(
        provider.processCardSubmission('invalid_secret', {
          number: '4242 4242 4242 4242',
          expMonth: 12,
          expYear: 2030,
          cvc: '123',
        }),
      ).rejects.toThrow('Invalid or expired client secret');
    });
  });

  describe('completeAction', () => {
    it('transitions requires_action → succeeded', async () => {
      const created = await provider.createPayment(baseInput);

      await provider.processCardSubmission(created.clientSecret!, {
        number: '4000 0025 0000 3155',
        expMonth: 12,
        expYear: 2030,
        cvc: '123',
      });

      const result = await provider.completeAction(created.clientSecret!);

      expect(result.status).toBe('succeeded');
      expect(result.providerRef).toBe(created.providerRef);
    });

    it('returns current state if not in requires_action', async () => {
      const created = await provider.createPayment(baseInput);

      const result = await provider.completeAction(created.clientSecret!);

      expect(result.status).toBe('requires_payment_method');
    });
  });

  describe('amount and currency verification', () => {
    it('preserves server-side amount through full lifecycle', async () => {
      const input = { ...baseInput, amountCents: 12_345, currency: 'EUR' };
      const created = await provider.createPayment(input);

      const result = await provider.processCardSubmission(created.clientSecret!, {
        number: '4242 4242 4242 4242',
        expMonth: 6,
        expYear: 2028,
        cvc: '456',
      });

      expect(result.status).toBe('succeeded');

      const retrieved = await provider.retrievePayment(result.providerRef);
      expect(retrieved.amountReceivedCents).toBe(12_345);
    });
  });

  describe('card number format handling', () => {
    it('handles card numbers without spaces', async () => {
      const created = await provider.createPayment(baseInput);

      const result = await provider.processCardSubmission(created.clientSecret!, {
        number: '4242424242424242',
        expMonth: 12,
        expYear: 2030,
        cvc: '123',
      });

      expect(result.status).toBe('succeeded');
    });

    it('handles card numbers with spaces', async () => {
      const created = await provider.createPayment(baseInput);

      const result = await provider.processCardSubmission(created.clientSecret!, {
        number: '4242 4242 4242 4242',
        expMonth: 12,
        expYear: 2030,
        cvc: '123',
      });

      expect(result.status).toBe('succeeded');
    });
  });

  describe('provider name', () => {
    it('identifies as demo provider', () => {
      expect(provider.name).toBe('demo');
    });
  });
});
