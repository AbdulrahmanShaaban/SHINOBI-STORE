/** Skeleton mirrors the final two-column layout to avoid CLS on load. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 pt-28 lg:pt-32 pb-24">
      <div className="h-4 w-48 bg-[#16161F] rounded animate-pulse" aria-hidden="true" />
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 mt-6 lg:mt-10">
        <div
          className="aspect-square w-full rounded-xl bg-[#12121A] border border-[#2A2A3A] animate-pulse"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-5" role="status" aria-label="Loading product">
          <div className="h-3 w-24 bg-[#16161F] rounded animate-pulse" />
          <div className="h-12 w-full bg-[#16161F] rounded animate-pulse" />
          <div className="h-4 w-40 bg-[#16161F] rounded animate-pulse" />
          <div className="space-y-2 mt-2">
            <div className="h-3 w-full bg-[#16161F] rounded animate-pulse" />
            <div className="h-3 w-full bg-[#16161F] rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-[#16161F] rounded animate-pulse" />
          </div>
          <div className="h-10 w-28 bg-[#16161F] rounded animate-pulse mt-4" />
          <div className="flex gap-2">
            <div className="h-11 w-14 bg-[#16161F] rounded-lg animate-pulse" />
            <div className="h-11 w-14 bg-[#16161F] rounded-lg animate-pulse" />
            <div className="h-11 w-14 bg-[#16161F] rounded-lg animate-pulse" />
          </div>
          <div className="h-14 w-full bg-[#CC0000]/20 rounded-lg animate-pulse mt-2" />
        </div>
      </div>
    </main>
  );
}
