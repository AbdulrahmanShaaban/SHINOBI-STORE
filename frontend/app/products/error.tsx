'use client';

import { useEffect } from 'react';

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-col items-center justify-center text-center min-h-[70vh] px-4 pt-24">
      <h1 className="font-cinzel text-2xl sm:text-3xl font-bold">The armory gates are stuck</h1>
      <p className="text-[#6B6B80] mt-3 max-w-md">
        Something went wrong while loading the shop. It is not you — it was the chakra network.
      </p>
      <button
        onClick={reset}
        className="mt-8 inline-flex items-center h-12 px-8 rounded-lg bg-[#CC0000] hover:bg-[#FF6B00] transition-colors font-cinzel font-bold tracking-wider focus-visible:outline-none focus-visible:border-[#FF6B00]"
      >
        TRY AGAIN
      </button>
    </main>
  );
}
