import Link from 'next/link';

export default function ProductNotFound() {
  return (
    <main className="flex flex-col items-center justify-center text-center min-h-[70vh] px-4 pt-24">
      <p className="font-bebas text-[clamp(4rem,12vw,9rem)] leading-none text-[#CC0000]">404</p>
      <h1 className="font-anton uppercase text-2xl sm:text-3xl mt-2">
        This jutsu vanished
      </h1>
      <p className="font-inter text-[#6B6B80] mt-3 max-w-md">
        The product you are looking for does not exist or is no longer available.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center h-12 px-8 rounded-lg bg-[#CC0000] hover:bg-[#FF6B00] transition-colors font-cinzel font-bold tracking-wider"
      >
        BACK TO THE HIDDEN LEAF
      </Link>
    </main>
  );
}
