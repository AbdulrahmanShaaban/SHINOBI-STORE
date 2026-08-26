'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthCard, { buttonClass } from '@/components/auth/AuthCard';
import { authApi, AuthError } from '@/lib/auth';

function VerifyForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Please use the link from your email.');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Email verified! You can now sign in.');
      })
      .catch((err) => {
        setStatus('error');
        if (err instanceof AuthError) {
          setMessage(err.message);
        } else {
          setMessage('Something went wrong. Please try again.');
        }
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <AuthCard title="VERIFYING YOUR EMAIL" subtitle="Please wait while we verify your email address...">
        <p className="text-sm text-[#6B6B80] text-center">Processing...</p>
      </AuthCard>
    );
  }

  if (status === 'success') {
    return (
      <AuthCard
        title="EMAIL VERIFIED"
        subtitle={message}
        footer={{ text: 'Ready to go?', href: '/account/login', linkText: 'Sign in' }}
      >
        <Link href="/account/login" className={buttonClass + ' block text-center'}>
          SIGN IN
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="VERIFICATION FAILED"
      subtitle={message}
      footer={{ text: 'Need help?', href: '/account/login', linkText: 'Back to sign in' }}
    >
      <p className="text-sm text-[#6B6B80]">
        The link may have expired or already been used. Request a new verification email from the sign-in page.
      </p>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
