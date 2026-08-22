'use client';

import { useEffect } from 'react';

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in browser console; server errors are already logged API-side
    // with a request id the user can be given by support.
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-col items-center justify-center text-center min-h-[70vh] px-4 pt-24">
      <h1 className="font-anton uppercase text-2xl sm:text-3xl">The scroll is damaged</h1>
      <p className="font-inter text-[#6B6B80] mt-3 max-w-md">
        Something went wrong while loading this product. It is not you — it was the chakra
        network.
      </p>
      <button
        onClick={reset}
        className="mt-8 inline-flex items-center h-12 px-8 rounded-lg bg-[#CC0000] hover:bg-[#FF6B00] transition-colors font-cinzel font-bold tracking-wider"
      >
        TRY AGAIN
      </button>
    </main>
  );
}
