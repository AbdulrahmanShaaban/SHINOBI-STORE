"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FOOTER_LINKS = [
  {
    label: "SHOP ALL",
    href: "/products",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
  },
  {
    label: "ABOUT US",
    href: "/about",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
  },
  {
    label: "COMMUNITY",
    href: "/community",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
  },
  {
    label: "CONTACT",
    href: "/contact",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  },
];

const SOCIAL_LINKS = [
  {
    label: "INSTAGRAM",
    href: "#",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
  },
  {
    label: "X (TWITTER)",
    href: "#",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.9 7.9L23 22h-6.3l-4.9-6.4L6.2 22H3l7.4-8.5L1 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L6.6 3.9H4.8L17.8 20z" /></svg>
  },
  {
    label: "TIKTOK",
    href: "#",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12v-3.15a5.76 5.76 0 1 0 5.76 5.76V9.68a7.35 7.35 0 0 0 4.3 1.38V7.96a4.28 4.28 0 0 1-4.09-2.14z" /></svg>
  },
];

const Crosshair = ({ className }: { className?: string }) => (
  <svg className={`absolute w-3 h-3 text-white/30 z-20 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="12" y1="0" x2="12" y2="24" />
    <line x1="0" y1="12" x2="24" y2="12" />
  </svg>
);

export default function StoreFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setJoined(true);
  };

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.fromTo(
        ".footer-massive-text span",
        { y: "100%" },
        {
          y: "0%",
          duration: 1.2,
          stagger: 0.05,
          ease: "power4.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 85%",
            once: true,
          },
        }
      );

      gsap.fromTo(
        ".footer-anim",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 65%",
            once: true,
          },
        }
      );

      // Continuous rotation for shuriken
      gsap.to(".shuriken-spin", {
        rotation: 360,
        duration: 10,
        repeat: -1,
        ease: "linear",
      });
    },
    { scope: footerRef }
  );

  return (
    <footer
      ref={footerRef}
      id="footer"
      className="relative w-full min-h-screen flex flex-col bg-[#050505] text-[#F5E6C8] border-t border-white/10 overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[50vh] bg-gradient-to-r from-[#F97316]/5 via-[#EC4899]/5 to-[#9333EA]/5 blur-[120px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      {/* Massive Top Text */}
      <div className="w-full overflow-hidden pt-12 md:pt-16 pb-8 md:pb-12 flex items-center justify-center relative flex-shrink-0">
        <h1 className="footer-massive-text font-anton text-[18vw] leading-[0.75] tracking-tight uppercase flex overflow-hidden select-none">
          {Array.from("SHINOBI ").map((char, i) => (
            <span key={i} className="inline-block text-white/5">{char === " " ? "\u00A0" : char}</span>
          ))}
          {Array.from("STORE").map((char, i) => (
            <span key={`store-${i}`} className="inline-block bg-gradient-to-b from-[#F97316] to-[#9333EA] bg-clip-text text-transparent opacity-80">{char}</span>
          ))}
        </h1>
      </div>

      {/* ===================== MOBILE LAYOUT (< lg) ===================== */}
      <div className="flex flex-col relative z-10 flex-1 lg:hidden">

        {/* Decorative Shuriken Graphic */}
        <svg className="shuriken-spin absolute -right-10 -top-10 w-40 h-40 text-white/[0.03] pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>

        {/* Section 1: Heading + Newsletter */}
        <div className="footer-anim px-6 pt-10 pb-12 relative z-10">
          <h2 className="font-anton text-[36px] sm:text-[48px] leading-[0.9] uppercase tracking-wide text-white">
            GET UPDATES ON RARE DROPS & NEW ARRIVALS.
          </h2>

          <div className="mt-8 w-full max-w-[360px]">
            {joined ? (
              <div className="font-cinzel text-lg font-bold tracking-[0.2em] text-[#F97316] flex items-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                WELCOME TO THE CLAN.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-end w-full border-b border-white/30 pb-3 group focus-within:border-[#F97316] transition-colors">
                <svg className="w-5 h-5 text-white/30 group-focus-within:text-[#F97316] mr-3 mb-1 transition-colors hidden sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <label htmlFor="footer-email-mobile" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-email-mobile"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 bg-transparent outline-none font-inter text-sm text-white placeholder:text-white/40"
                />
                <button type="submit" aria-label="Subscribe to the newsletter" className="pl-4 text-white/60 group-focus-within:text-[#F97316] hover:text-[#F97316] hover:translate-x-1 transition-all">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Section 2: Contact Email */}
        <div className="footer-anim border-t border-white/10 px-6 py-6">
          <a href="mailto:support@shinobistore.com" className="inline-flex items-center gap-3 font-inter text-sm text-white/60 hover:text-[#F97316] transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <polyline points="3 7 12 13 21 7" />
            </svg>
            support@shinobistore.com
          </a>
        </div>

        {/* Section 3: Menu Links */}
        <div className="footer-anim border-t border-white/10 px-6 pt-8 pb-8">
          <h3 className="flex items-center gap-2 font-inter text-[11px] font-bold text-white/40 tracking-[0.2em] uppercase mb-5">
            <div className="w-1.5 h-1.5 bg-[#F97316] rounded-full" /> MENU
          </h3>
          <ul className="flex flex-col gap-3">
            {FOOTER_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="group flex items-center gap-3 font-anton text-lg tracking-wide text-white/80 hover:text-[#F97316] transition-colors uppercase">
                  <span className="text-white/30 group-hover:text-[#F97316] transition-colors">
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 4: Social Links */}
        <div className="footer-anim border-t border-white/10 px-6 pt-8 pb-8">
          <h3 className="flex items-center gap-2 font-inter text-[11px] font-bold text-white/40 tracking-[0.2em] uppercase mb-5">
            <div className="w-1.5 h-1.5 bg-[#9333EA] rounded-full" /> SOCIALS
          </h3>
          <ul className="flex flex-col gap-2">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.label}>
                <a href={social.href} className="group flex items-center justify-between py-3 border-b border-white/5 hover:border-[#F97316]/30 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-white/50 group-hover:text-white transition-colors">
                      {social.icon}
                    </span>
                    <span className="font-anton text-sm tracking-widest text-white/70 group-hover:text-white transition-colors uppercase">
                      {social.label}
                    </span>
                  </div>
                  <svg className="w-3.5 h-3.5 text-white/30 group-hover:text-[#F97316] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                    <path d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 5: Copyright */}
        <div className="footer-anim mt-auto border-t border-white/10 px-6 py-6 flex items-center justify-between">
          <div>
            <p className="font-inter text-[10px] text-white/40 tracking-[0.1em] mb-0.5">
              © 2026 SHINOBI STORE
            </p>
            <p className="font-inter text-[10px] text-white/40 tracking-[0.1em]">
              ALL RIGHTS RESERVED.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-inter text-[10px] text-white/40 tracking-[0.15em] uppercase">
              DESIGN & DEV BY ME
            </span>
            <svg className="w-3.5 h-3.5 text-[#F97316]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>
        </div>

      </div>

      {/* ===================== DESKTOP LAYOUT (lg+) ===================== */}
      <div className="hidden lg:grid grid-cols-2 relative z-10 flex-1 overflow-y-auto overflow-x-hidden border-t border-white/10 mt-16">

        {/* Crosshairs (Brutalist Accents) */}
        <Crosshair className="top-[-6px] left-1/2 -translate-x-1/2" />
        <Crosshair className="bottom-[-6px] left-1/2 -translate-x-1/2" />
        <Crosshair className="top-[-6px] left-20" />
        <Crosshair className="top-[-6px] right-20" />

        {/* Left Column */}
        <div className="flex flex-col justify-between p-16 border-r border-white/10 relative overflow-hidden h-full">

          {/* Decorative Shuriken Graphic */}
          <svg className="shuriken-spin absolute -right-20 -top-20 w-64 h-64 text-white/[0.03] pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>

          <div className="footer-anim max-w-[600px] relative z-10 flex flex-col items-start text-left w-full">
            <h2 className="font-anton text-[70px] leading-[0.9] uppercase tracking-wide text-white">
              GET UPDATES ON RARE DROPS & NEW ARRIVALS.
            </h2>

            {/* Minimalist Newsletter Form */}
            <div className="mt-16 w-full max-w-[400px]">
              {joined ? (
                <div className="font-cinzel text-lg font-bold tracking-[0.2em] text-[#F97316] flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  WELCOME TO THE CLAN.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex items-end w-full border-b border-white/30 pb-3 group focus-within:border-[#F97316] transition-colors">
                  <svg className="w-5 h-5 text-white/30 group-focus-within:text-[#F97316] mr-3 mb-1 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <label htmlFor="footer-email-desktop" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="footer-email-desktop"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="flex-1 bg-transparent outline-none font-inter text-base text-white placeholder:text-white/40"
                  />
                  <button type="submit" aria-label="Subscribe to the newsletter" className="pl-4 text-white/60 group-focus-within:text-[#F97316] hover:text-[#F97316] hover:translate-x-1 transition-all">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Contact Email */}
          <div className="footer-anim mt-32 relative z-10 flex justify-start">
            <a href="mailto:support@shinobistore.com" className="inline-flex items-center gap-3 font-inter text-base text-white/60 hover:text-[#F97316] transition-colors bg-white/5 border border-white/10 px-4 py-2 rounded">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <polyline points="3 7 12 13 21 7" />
              </svg>
              support@shinobistore.com
            </a>
          </div>

        </div>

        {/* Right Column */}
        <div className="flex flex-col justify-between p-16 relative h-full">

          <div className="grid grid-cols-2 gap-20">
            {/* Navigation Links */}
            <div className="footer-anim">
              <h3 className="flex items-center gap-2 font-inter text-[11px] font-bold text-white/40 tracking-[0.2em] uppercase mb-8">
                <div className="w-1.5 h-1.5 bg-[#F97316] rounded-full" /> MENU
              </h3>
              <ul className="flex flex-col gap-4">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="group flex items-center gap-3 font-anton text-xl tracking-wide text-white/80 hover:text-[#F97316] transition-colors uppercase">
                      <span className="text-white/30 group-hover:text-[#F97316] transition-colors">
                        {link.icon}
                      </span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Boxed Social Links */}
            <div className="footer-anim">
              <h3 className="flex items-center gap-2 font-inter text-[11px] font-bold text-white/40 tracking-[0.2em] uppercase mb-8">
                <div className="w-1.5 h-1.5 bg-[#9333EA] rounded-full" /> SOCIALS
              </h3>
              <ul className="flex flex-col gap-3">
                {SOCIAL_LINKS.map((social) => (
                  <li key={social.label}>
                    <a href={social.href} className="group flex items-center justify-between px-4 py-2.5 border border-white/10 rounded hover:border-[#F97316]/50 hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-3">
                        <span className="text-white/50 group-hover:text-white transition-colors">
                          {social.icon}
                        </span>
                        <span className="font-anton text-base tracking-widest text-white/70 group-hover:text-white transition-colors mt-0.5 uppercase">
                          {social.label}
                        </span>
                      </div>
                      <svg className="w-3.5 h-3.5 text-white/30 group-hover:text-[#F97316] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Right Details */}
          <div className="footer-anim mt-32 flex items-end justify-between gap-6 border-t border-white/10">
            <div>
              <p className="font-inter text-xs text-white/40 tracking-[0.1em] mb-1">
                ALL RIGHTS RESERVED.
              </p>
              <p className="font-inter text-xs text-white/40 tracking-[0.1em]">
                © 2026 SHINOBI STORE
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-inter text-xs text-white/40 tracking-[0.15em] uppercase">
                DESIGN & DEV BY ME
              </span>
              <svg className="w-4 h-4 text-[#F97316]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}