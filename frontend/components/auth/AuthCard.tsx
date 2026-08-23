'use client';

import Link from 'next/link';

/** Shared shell for auth surfaces — one visual language across all flows. */
export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: { text: string; href: string; linkText: string };
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-[#2A2A3A] bg-[#16161F] p-8">
        <h1 className="font-bebas text-4xl tracking-wide text-[#F0F0F0]">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-[#B8B8CC]">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? (
        <p className="mt-6 text-sm text-[#6B6B80]">
          {footer.text}{' '}
          <Link
            href={footer.href}
            className="text-[#FF6B00] underline underline-offset-4 hover:text-[#FFB800]"
          >
            {footer.linkText}
          </Link>
        </p>
      ) : null}
    </main>
  );
}

export const inputClass =
  'w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none';

export const buttonClass =
  'w-full py-3 rounded-lg bg-[#CC0000] hover:bg-[#FF6B00] transition-colors font-cinzel font-bold tracking-wider text-white disabled:opacity-50 disabled:cursor-not-allowed';
