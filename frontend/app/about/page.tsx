import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us — Shinobi Store',
  description:
    'Learn about Shinobi Store — your one-stop shop for premium anime merchandise, figures, apparel, and collectibles inspired by your favorite series.',
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10 pt-12 lg:pt-20 pb-24">
      {/* Hero */}
      <section className="mb-16 lg:mb-24">
        <h1 className="font-anton text-[clamp(2.5rem,6vw,5rem)] uppercase tracking-wide text-[#F0F0F0] leading-[0.95] mb-6">
          ABOUT US
        </h1>
        <div className="w-20 h-1 bg-[#FF6B00] rounded-full" />
      </section>

      {/* Story */}
      <section className="mb-16 lg:mb-24 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-cinzel text-xl font-bold text-[#FFB800] uppercase tracking-wider mb-4">
            Our Story
          </h2>
          <p className="font-inter text-[#B9B9C9] leading-relaxed mb-4">
            Shinobi Store was born from a deep love for anime culture and the desire to bring
            fans closer to the series they love. What started as a small passion project has
            grown into a curated destination for high-quality anime merchandise.
          </p>
          <p className="font-inter text-[#B9B9C9] leading-relaxed">
            Every product in our collection is hand-picked with care — from premium apparel
            featuring your favorite characters to exclusive figures and collectibles you
            won&apos;t find anywhere else.
          </p>
        </div>
        <div className="rounded-xl border border-[#2A2A3A] bg-[#12121A] p-8 flex items-center justify-center">
          <div className="text-center">
            <img src="/sections/kunai-white.svg" alt="" className="w-24 h-24 mx-auto mb-4" />
            <p className="font-inter text-sm text-[#6B6B80] mt-2 tracking-wider">SHINOBI — THE HIDDEN ONE</p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="mb-16 lg:mb-24">
        <h2 className="font-cinzel text-xl font-bold text-[#FFB800] uppercase tracking-wider mb-4">
          Our Mission
        </h2>
        <p className="font-inter text-[#B9B9C9] leading-relaxed max-w-[800px]">
          We believe every fan deserves access to authentic, well-crafted merchandise that
          truly represents the worlds and characters they adore. Our mission is to bridge
          the gap between fans and the anime they love through carefully curated products,
          fast worldwide shipping, and a community-driven shopping experience.
        </p>
      </section>

      {/* Values */}
      <section className="mb-16 lg:mb-24">
        <h2 className="font-cinzel text-xl font-bold text-[#FFB800] uppercase tracking-wider mb-8">
          What We Stand For
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'AUTHENTICITY',
              desc: 'Every item is sourced from official licensors and verified partners. No bootlegs, no compromises.',
              icon: '/sections/icon-trust.svg',
            },
            {
              title: 'QUALITY',
              desc: 'From print-on-demand apparel to hand-painted figures, quality is at the core of every product we ship.',
              icon: '/sections/icon-quality.svg',
            },
            {
              title: 'COMMUNITY',
              desc: 'We are fans building for fans. Your feedback shapes our catalog, our drops, and our future.',
              icon: '/sections/icon-community.svg',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[#2A2A3A] bg-[#12121A] p-6 hover:border-[#FF6B00]/40 transition-colors"
            >
              <img src={item.icon} alt="" className="w-12 h-12 mb-3" />
              <h3 className="font-cinzel text-sm font-bold text-[#F0F0F0] uppercase tracking-wider mb-2">
                {item.title}
              </h3>
              <p className="font-inter text-sm text-[#6B6B80] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-8 lg:p-12">
        <h2 className="font-cinzel text-xl font-bold text-[#FFB800] uppercase tracking-wider mb-4">
          Get In Touch
        </h2>
        <p className="font-inter text-[#B9B9C9] leading-relaxed mb-6">
          Have a question, partnership inquiry, or just want to say hello? We&apos;d love to hear from you.
        </p>
        <a
          href="mailto:aboodxs3a@gmail.com"
          className="inline-flex items-center gap-3 font-inter text-[#FF6B00] hover:text-[#FF8433] transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <polyline points="3 7 12 13 21 7" />
          </svg>
          aboodxs3a@gmail.com
        </a>
      </section>
    </main>
  );
}
