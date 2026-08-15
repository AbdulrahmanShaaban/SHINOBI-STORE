"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FOOTER_LINKS = [
  { label: "HOME", href: "/" },
  { label: "SHOP", href: "/products" },
  { label: "ABOUT", href: "/about" },
  { label: "CONTACT", href: "/contact" },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12v-3.15a5.76 5.76 0 1 0 5.76 5.76V9.68a7.35 7.35 0 0 0 4.3 1.38V7.96a4.28 4.28 0 0 1-4.09-2.14z" />
      </svg>
    ),
  },
  {
    label: "X",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.9 2H22l-6.9 7.9L23 22h-6.3l-4.9-6.4L6.2 22H3l7.4-8.5L1 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L6.6 3.9H4.8L17.8 20z" />
      </svg>
    ),
  },
];

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
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduced) return;

      gsap.fromTo(
        ".footer-brand",
        { y: 48, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 85%",
            once: true,
          },
        }
      );
      gsap.fromTo(
        ".footer-col",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 75%",
            once: true,
          },
        }
      );
    },
    { scope: footerRef }
  );

  return (
    <footer
      ref={footerRef}
      id="newsletter"
      className="flex flex-col w-full bg-[#0D0A08] border-t"
      style={{ borderColor: "rgba(245,230,200,0.20)" }}
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-12 xl:px-[72px] flex-1 flex flex-col justify-center py-16 md:py-24 gap-14 md:gap-20 md:min-h-[80svh]">
        {/* Giant brand block */}
        <div className="footer-brand text-center md:text-left">
          <div
            className="font-anton uppercase leading-[0.9] tracking-[0.02em]"
            style={{ fontSize: "clamp(54px, 9vw, 170px)", color: "#F5E6C8" }}
          >
            SHINOBI STORE
          </div>
          <p
            className="mt-6 md:mt-8 font-inter text-base md:text-lg"
            style={{ color: "rgba(245,230,200,0.55)" }}
          >
            For fans of the shinobi world.
          </p>
          <p
            className="mt-2 font-inter text-sm"
            style={{ color: "rgba(245,230,200,0.40)" }}
          >
            Collect the legends. Keep the story alive.
          </p>
        </div>

        {/* Columns */}
        <div className="footer-col grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          <nav className="md:col-span-4 flex flex-col items-center md:items-start gap-5">
            <div
              className="font-anton text-sm tracking-[0.3em]"
              style={{ color: "rgba(245,230,200,0.55)" }}
            >
              NAVIGATION
            </div>
            <ul className="flex flex-col items-center md:items-start gap-4">
              {FOOTER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group relative w-fit inline-block font-cinzel font-bold text-base md:text-lg tracking-[0.2em] transition-colors duration-300 hover:text-[#FF5A2A]"
                    style={{ color: "#F5E6C8" }}
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 left-0 h-px w-0 bg-[#FF5A2A] transition-all duration-300 group-hover:w-full"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-8 flex flex-col gap-10">
            {/* Newsletter */}
            <div
              className="rounded-lg p-6 md:p-8 border border-dashed"
              style={{ borderColor: "rgba(245,230,200,0.20)" }}
            >
              <div
                className="font-anton uppercase text-xl md:text-2xl tracking-[0.06em]"
                style={{ color: "#F5E6C8" }}
              >
                JOIN THE SHINOBI WORLD
              </div>
              <p
                className="font-inter text-sm mt-2"
                style={{ color: "rgba(245,230,200,0.55)" }}
              >
                New drops. Rare pieces. Store updates.
              </p>

              {joined ? (
                <div
                  className="mt-5 font-cinzel font-bold text-sm tracking-[0.2em]"
                  style={{ color: "#FF5A2A" }}
                >
                  WELCOME TO THE CLAN.
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="mt-5 flex items-stretch gap-2"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Your email..."
                    aria-label="Email address"
                    className="flex-1 min-w-0 h-12 rounded-md px-4 font-inter text-sm outline-none transition-colors duration-300 focus:border-[#FF5A2A] bg-[#101014]"
                    style={{
                      color: "#F5E6C8",
                      border: "1px solid rgba(245,230,200,0.20)",
                    }}
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="w-12 h-12 flex-shrink-0 rounded-md flex items-center justify-center transition-all duration-300 hover:brightness-110 active:scale-[0.95]"
                    style={{ backgroundColor: "#FF5A2A", color: "#101014" }}
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </form>
              )}
            </div>

            {/* Socials */}
            <div className="flex items-center justify-center md:justify-start gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  className="w-11 h-11 rounded-md flex items-center justify-center transition-all duration-300 hover:border-[#FF5A2A] hover:text-[#FF5A2A]"
                  style={{
                    color: "#F5E6C8",
                    border: "1px solid rgba(245,230,200,0.20)",
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright row */}
      <div
        className="border-t"
        style={{ borderColor: "rgba(245,230,200,0.20)" }}
      >
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-12 xl:px-[72px] py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p
            className="font-inter text-xs tracking-[0.15em]"
            style={{ color: "rgba(245,230,200,0.45)" }}
          >
            © 2026 Shinobi Store
          </p>
          <p
            className="font-inter text-xs tracking-[0.15em]"
            style={{ color: "rgba(245,230,200,0.45)" }}
          >
            Built with ♥
          </p>
        </div>
      </div>
    </footer>
  );
}