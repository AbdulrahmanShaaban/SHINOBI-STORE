import { createHmac } from 'node:crypto';
import { StripeAdapter } from './stripe.adapter';

/**
 * §13.2 webhook integrity: constructEvent must reject anything that was not
 * signed with the provider webhook secret over the EXACT raw bytes. These
 * cases cover the realistic forgery vectors: wrong MAC, wrong secret and
 * replayed/stale timestamps (Stripe's default tolerance is 5 minutes).
 */

const SECRET = 'whsec_dummy_webhook_secret';
const PAYLOAD_STRING = JSON.stringify({
  id: 'evt_test_forgery',
  object: 'event',
  type: 'payment_intent.succeeded',
  data: { object: { id: 'pi_mock' } },
});
const PAYLOAD = Buffer.from(PAYLOAD_STRING, 'utf8');

function signedHeader(secret: string, timestampSec: number): string {
  const v1 = createHmac('sha256', secret).update(`${timestampSec}.${PAYLOAD_STRING}`).digest('hex');
  return `t=${timestampSec},v1=${v1}`;
}

describe('StripeAdapter.constructEvent signature verification', () => {
  const adapter = new StripeAdapter('sk_test_dummy_secret_key');

  it('accepts a correctly signed raw payload within tolerance', () => {
    const t = Math.floor(Date.now() / 1000);
    const event = adapter.constructEvent(PAYLOAD, signedHeader(SECRET, t), SECRET);
    expect(event.id).toBe('evt_test_forgery');
  });

  it('throws on a forged MAC', () => {
    const t = Math.floor(Date.now() / 1000);
    expect(() =>
      adapter.constructEvent(PAYLOAD, `t=${t},v1=${'0'.repeat(64)}`, SECRET),
    ).toThrow();
  });

  it('throws when the attacker signs with their own secret', () => {
    const t = Math.floor(Date.now() / 1000);
    expect(() =>
      adapter.constructEvent(PAYLOAD, signedHeader('whsec_attacker_owned', t), SECRET),
    ).toThrow();
  });

  it('throws on a tampered payload reusing a valid header', () => {
    const t = Math.floor(Date.now() / 1000);
    const valid = signedHeader(SECRET, t);
    const tampered = Buffer.from(PAYLOAD_STRING.replace('pi_mock', 'pi_attacker'), 'utf8');
    expect(() => adapter.constructEvent(tampered, valid, SECRET)).toThrow();
  });

  it('throws on stale timestamps outside the default 5-minute tolerance (replay)', () => {
    const stale = Math.floor(Date.now() / 1000) - 60 * 60;
    expect(() => adapter.constructEvent(PAYLOAD, signedHeader(SECRET, stale), SECRET)).toThrow();
  });
});
