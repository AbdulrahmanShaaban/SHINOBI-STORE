'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/money';

interface DemoPaymentFormProps {
  orderNumber: string;
  clientSecret: string;
  totalCents: number;
  currency: string;
  onDone: () => void;
}

const TEST_CARDS = [
  { label: 'Success', number: '4242 4242 4242 4242' },
  { label: 'Declined', number: '4000 0000 0000 0002' },
  { label: '3D Secure', number: '4000 0025 0000 3155' },
] as const;

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return digits.slice(0, 2) + '/' + digits.slice(2);
  }
  return digits;
}

export default function DemoPaymentForm({
  orderNumber,
  clientSecret,
  totalCents,
  currency,
  onDone,
}: DemoPaymentFormProps) {
  const router = useRouter();
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'form' | 'processing' | 'requires_action' | 'success' | 'failed'>('form');
  const [error, setError] = useState<string | null>(null);
  const [showTestCards, setShowTestCards] = useState(false);

  const fillTestCard = (number: string) => {
    setCardNumber(formatCardNumber(number));
    setShowTestCards(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/v1/payments/demo/process`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json', 'x-csrf-token': '1' },
          body: JSON.stringify({
            clientSecret,
            cardholderName,
            cardNumber: cardNumber.replace(/\s/g, ''),
            expiry,
            cvc,
          }),
        },
      );

      const body = (await res.json().catch(() => null)) as {
        status?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        setError(body?.message ?? 'Payment processing failed.');
        setBusy(false);
        return;
      }

      if (body?.status === 'succeeded') {
        setPhase('success');
        setTimeout(() => onDone(), 1_200);
      } else if (body?.status === 'requires_action') {
        setPhase('requires_action');
        setBusy(false);
      } else {
        setError(body?.message ?? 'Payment was not successful. Please try a different card.');
        setPhase('failed');
        setBusy(false);
      }
    } catch {
      setError('Network error — please try again.');
      setBusy(false);
    }
  };

  const handleCompleteAction = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/v1/payments/demo/complete-action`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json', 'x-csrf-token': '1' },
          body: JSON.stringify({ clientSecret }),
        },
      );

      const body = (await res.json().catch(() => null)) as {
        status?: string;
      } | null;

      if (body?.status === 'succeeded') {
        setPhase('success');
        setTimeout(() => onDone(), 1_200);
      } else {
        setError('Additional verification failed. Please try again.');
        setPhase('form');
        setBusy(false);
      }
    } catch {
      setError('Network error — please try again.');
      setPhase('form');
      setBusy(false);
    }
  };

  if (phase === 'success') {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FF6B00]/10 mb-4">
          <svg className="w-8 h-8 text-[#FF6B00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-bebas text-3xl text-[#F0F0F0]">PAYMENT CONFIRMED</h2>
        <p className="text-sm text-[#B8B8CC] mt-2">
          Redirecting to order confirmation…
        </p>
      </div>
    );
  }

  if (phase === 'requires_action') {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FFB800]/10 mb-4">
          <svg className="w-8 h-8 text-[#FFB800] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="font-bebas text-3xl text-[#F0F0F0]">ADDITIONAL VERIFICATION</h2>
        <p className="text-sm text-[#B8B8CC] mt-2 mb-6">
          Your card requires additional authentication. Click below to simulate completing 3D Secure verification.
        </p>
        <button
          onClick={handleCompleteAction}
          disabled={busy}
          className="px-8 py-3 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] transition-colors font-cinzel font-bold tracking-wider text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'VERIFYING…' : 'COMPLETE VERIFICATION'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Demo banner */}
      <div className="rounded-lg border border-[#FFB800]/30 bg-[#FFB800]/5 px-4 py-3 flex items-center gap-3">
        <svg className="w-5 h-5 text-[#FFB800] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-xs text-[#FFB800]">
          Demo Payment — No real charges will be made. Use test card numbers below.
        </p>
      </div>

      {/* Test card selector */}
      <div>
        <button
          type="button"
          onClick={() => setShowTestCards(!showTestCards)}
          className="text-xs text-[#FF6B00] hover:text-[#FF8533] underline underline-offset-4 transition-colors"
        >
          {showTestCards ? 'Hide test cards' : 'Use a test card →'}
        </button>
        {showTestCards && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {TEST_CARDS.map((tc) => (
              <button
                key={tc.number}
                type="button"
                onClick={() => fillTestCard(tc.number)}
                className="rounded-lg border border-[#2A2A3A] bg-[#12121A] px-3 py-2 text-left hover:border-[#FF6B00]/50 transition-colors group"
              >
                <span className="block text-xs font-mono text-[#F0F0F0] group-hover:text-[#FF6B00]">
                  {tc.number.slice(0, 7)}…
                </span>
                <span className="block text-[10px] text-[#6B6B80] mt-0.5">{tc.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cardholder name */}
      <div>
        <label className="block text-xs font-cinzel text-[#B8B8CC] mb-1.5">CARDHOLDER NAME</label>
        <input
          type="text"
          required
          placeholder="Full name on card"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none transition-colors"
        />
      </div>

      {/* Card number */}
      <div>
        <label className="block text-xs font-cinzel text-[#B8B8CC] mb-1.5">CARD NUMBER</label>
        <input
          type="text"
          required
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          maxLength={19}
          inputMode="numeric"
          className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-4 py-2.5 text-sm text-[#F0F0F0] font-mono placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none transition-colors"
        />
      </div>

      {/* Expiry + CVC row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-cinzel text-[#B8B8CC] mb-1.5">EXPIRY</label>
          <input
            type="text"
            required
            placeholder="MM/YY"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            maxLength={5}
            inputMode="numeric"
            className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-4 py-2.5 text-sm text-[#F0F0F0] font-mono placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-cinzel text-[#B8B8CC] mb-1.5">CVC</label>
          <input
            type="text"
            required
            placeholder="123"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            inputMode="numeric"
            className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-4 py-2.5 text-sm text-[#F0F0F0] font-mono placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-[#CC0000] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-[#F0F0F0]">{error}</p>
        </div>
      )}

      {/* Payment summary */}
      <div className="rounded-lg border border-[#2A2A3A] bg-[#12121A] p-4">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#6B6B80]">Amount to pay</span>
          <span className="font-bebas text-xl text-[#FFB800]">{formatPrice(totalCents)}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-[#6B6B80]">Order</span>
          <span className="text-xs font-mono text-[#B8B8CC]">{orderNumber}</span>
        </div>
      </div>

      {/* Pay button */}
      <button
        type="submit"
        disabled={busy || !cardNumber || !expiry || !cvc || !cardholderName}
        className="w-full py-4 rounded-lg bg-[#CC0000] hover:bg-[#FF6B00] transition-colors font-cinzel font-bold tracking-wider text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            PROCESSING…
          </span>
        ) : (
          'PAY NOW'
        )}
      </button>

      <p className="text-[10px] text-[#6B6B80] text-center leading-relaxed">
        This is a demo checkout. No real card data is transmitted or stored. Payment
        verification is handled server-side — this form never marks an order paid.
      </p>
    </form>
  );
}
