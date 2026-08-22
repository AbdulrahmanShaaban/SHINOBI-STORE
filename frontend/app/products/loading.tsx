/** Skeleton mirroring the shop layout to prevent CLS on data arrival. */
export default function ProductsLoading() {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading products…</span>
      <header className="mb-6">
        <div className="h-14 w-64 rounded bg-[#1D1D2A] animate-pulse motion-reduce:animate-none" />
        <div className="mt-3 h-4 w-32 rounded bg-[#1D1D2A] animate-pulse motion-reduce:animate-none" />
      </header>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-56 shrink-0 space-y-6" aria-hidden="true">
          {['Category', 'Anime', 'Character', 'Tags'].map((label) => (
            <div key={label}>
              <div className="h-4 w-24 rounded bg-[#1D1D2A] mb-2 animate-pulse motion-reduce:animate-none" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-5 rounded bg-[#16161F] mb-1.5 animate-pulse motion-reduce:animate-none" />
              ))}
            </div>
          ))}
        </aside>

        <section className="flex-1 min-w-0">
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-[#1D1D2A]">
                <div className="aspect-square bg-[#16161F] animate-pulse motion-reduce:animate-none" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-[#1D1D2A] animate-pulse motion-reduce:animate-none" />
                  <div className="h-6 w-16 rounded bg-[#1D1D2A] animate-pulse motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
