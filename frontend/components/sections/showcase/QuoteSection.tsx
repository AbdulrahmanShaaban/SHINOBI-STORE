"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const MARQUEE_ROWS = [
  {
    text: "SHINOBI \u2022 CHAKRA \u2022 JUTSU \u2022 WILL OF FIRE \u2022",
    direction: "left" as const,
    speed: 110,
    theme: "dark" as const,
  },
  {
    text: "LEAF \u2022 UCHIHA \u2022 AKATSUKI \u2022 HOKAGE \u2022",
    direction: "right" as const,
    speed: 90,
    theme: "accent" as const,
  },
];

const MARQUEE_COPIES = 4;

function MarqueeRow({ row }: { row: (typeof MARQUEE_ROWS)[number] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(track, { xPercent: 0 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const getCopyWidth = () => track.scrollWidth / MARQUEE_COPIES;
        const getSpeed = () =>
          row.speed * (window.innerWidth < 768 ? 0.7 : 1);
        const getDuration = () => getCopyWidth() / getSpeed();

        const tween = gsap.fromTo(
          track,
          { xPercent: row.direction === "left" ? 0 : -25 },
          {
            xPercent: row.direction === "left" ? -25 : 0,
            duration: getDuration(),
            ease: "none",
            repeat: -1,
          }
        );

        const ro = new ResizeObserver(() => tween.duration(getDuration()));
        ro.observe(track);

        return () => {
          ro.disconnect();
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: rowRef, dependencies: [row] }
  );

  return (
    <div
      ref={rowRef}
      aria-hidden="true"
      className={`relative overflow-hidden whitespace-nowrap select-none ${
        row.theme === "accent" ? "bg-[#FF5A2A]" : "bg-[#101014]"
      }`}
    >
      <div
        ref={trackRef}
        className="flex w-max will-change-transform py-3 md:py-7"
      >
        {Array.from({ length: MARQUEE_COPIES }).map((_, i) => (
          <span
            key={i}
            className={`font-anton uppercase leading-none tracking-[0.02em] ${
              row.theme === "accent" ? "text-[#101014]" : "text-[#F5E6C8]"
            }`}
            style={{ fontSize: "clamp(52px, 6.4vw, 120px)" }}
          >
            {row.text}
          </span>
        ))}
      </div>
    </div>
  );
}

const QUOTE = "THOSE WHO CANNOT ACKNOWLEDGE THEMSELVES WILL EVENTUALLY FAIL.";
const QUOTE_CHARS = Array.from(QUOTE);

export default function QuoteSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const quoteTextRef = useRef<HTMLHeadingElement>(null);
  const attributionRef = useRef<HTMLDivElement>(null);
  const mobileQuotePinRef = useRef<HTMLDivElement>(null);
  const mobileQuoteTextRef = useRef<HTMLHeadingElement>(null);
  const mobileAttributionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // ── Desktop (md+): pin the desktop quote panel only ──
      mm.add("(min-width: 768px)", () => {
        const pin = pinRef.current;
        const quoteText = quoteTextRef.current;
        const attribution = attributionRef.current;
        if (!pin || !quoteText) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reducedMotion) {
          const chars = quoteText.querySelectorAll<HTMLElement>(".quote-char");
          gsap.set(chars, { opacity: 1, yPercent: 0, rotationX: 0, filter: "none", color: "#F5E6C8", clearProps: "transform,perspective" });
          if (attribution) gsap.set(attribution, { opacity: 1, y: 0, clearProps: "transform" });
          return;
        }

        const chars = Array.from(
          quoteText.querySelectorAll<HTMLElement>(".quote-char")
        );

        gsap.set(chars, {
          opacity: 0,
          yPercent: 120,
          rotationX: 70,
          transformPerspective: 800,
          filter: "blur(8px)",
          color: "#3A3A40",
        });
        if (attribution) gsap.set(attribution, { opacity: 0, y: 20 });

        const CHARACTER_OFFSET = 0.065;

        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: {
            trigger: pin,
            pin: pin,
            start: "top top",
            end: () => `+=1800`,
            scrub: 1,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: -2,
          },
        });

        chars.forEach((char, index) => {
          tl.to(
            char,
            {
              opacity: 1,
              yPercent: 0,
              rotationX: 0,
              filter: "blur(0px)",
              color: "#F5E6C8",
              duration: 0.7,
              ease: "power3.out",
            },
            index * CHARACTER_OFFSET
          );
        });

        if (attribution) {
          tl.to(
            attribution,
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
            "+=0.15"
          );
        }
      });

      // ── Mobile (<768px): pin the mobile quote panel only ──
      mm.add("(max-width: 767px)", () => {
        const quotePin = mobileQuotePinRef.current;
        const quoteText = mobileQuoteTextRef.current;
        const attribution = mobileAttributionRef.current;
        if (!quotePin || !quoteText) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reducedMotion) {
          const chars = quoteText.querySelectorAll<HTMLElement>(".quote-char");
          gsap.set(chars, { opacity: 1, yPercent: 0, rotationX: 0, filter: "none", color: "#F5E6C8", clearProps: "transform,perspective" });
          if (attribution) gsap.set(attribution, { opacity: 1, y: 0, clearProps: "transform" });
          return;
        }

        const chars = Array.from(
          quoteText.querySelectorAll<HTMLElement>(".quote-char")
        );

        gsap.set(chars, {
          opacity: 0,
          yPercent: 120,
          rotationX: 70,
          transformPerspective: 800,
          filter: "blur(8px)",
          color: "#3A3A40",
        });
        if (attribution) gsap.set(attribution, { opacity: 0, y: 20 });

        const CHARACTER_OFFSET = 0.065;

        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: {
            trigger: quotePin,
            pin: quotePin,
            start: "top top",
            end: () => `+=1200`,
            scrub: 1,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: -2,
          },
        });

        chars.forEach((char, index) => {
          tl.to(
            char,
            {
              opacity: 1,
              yPercent: 0,
              rotationX: 0,
              filter: "blur(0px)",
              color: "#F5E6C8",
              duration: 0.7,
              ease: "power3.out",
            },
            index * CHARACTER_OFFSET
          );
        });

        if (attribution) {
          tl.to(
            attribution,
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
            "+=0.15"
          );
        }
      });

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden bg-[#101014]">
      {/* Marquees */}
      <div className="pt-[clamp(48px,6vh,90px)] md:pt-[clamp(96px,12vh,180px)]">
        {MARQUEE_ROWS.map((row) => (
          <MarqueeRow key={row.text} row={row} />
        ))}
      </div>

      {/* Desktop quote — pinned */}
      <div className="hidden md:block">
        <div
          ref={pinRef}
          className="relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden"
          style={{ background: "radial-gradient(ellipse at center, #101014 0%, #0A0A0F 100%)" }}
        >
          <div className="w-full max-w-[1300px] px-6 text-center">
            <h2
              ref={quoteTextRef}
              className="font-anton text-[clamp(34px,10vw,68px)] uppercase leading-[0.88] tracking-[0.02em] md:text-[clamp(48px,5.5vw,100px)]"
              style={{ color: "#F5E6C8" }}
            >
              {QUOTE.split(" ").map((word, wordIndex, arr) => (
                <span key={wordIndex} style={{ display: "inline" }}>
                  <span style={{ display: "inline-flex" }}>
                    {Array.from(word).map((char, charIndex) => (
                      <span key={`${wordIndex}-${charIndex}`} className="inline-block overflow-hidden">
                        <span className="quote-char inline-block will-change-transform" style={{ color: "#F5E6C8" }}>
                          {char}
                        </span>
                      </span>
                    ))}
                  </span>
                  {wordIndex !== arr.length - 1 && (
                    <span className="inline-block overflow-hidden">
                      <span className="quote-char inline-block will-change-transform" style={{ color: "#F5E6C8" }}>
                        {"\u00A0"}
                      </span>
                    </span>
                  )}
                </span>
              ))}
            </h2>

            <div ref={attributionRef} className="mt-9 flex flex-col items-center md:mt-12">
              <span className="font-inter text-sm uppercase tracking-[0.18em] md:text-base"
                style={{ color: "rgba(245,230,200,0.58)" }}>
                ITACHI UCHIHA
              </span>
              <span className="mt-3 h-[2px] w-16 md:w-24"
                style={{ background: "linear-gradient(90deg, transparent, #FF5A2A, transparent)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile quote — pinned independently */}
      <div className="block md:hidden">
        <div
          ref={mobileQuotePinRef}
          className="relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-6 text-center"
          style={{ background: "radial-gradient(ellipse at center, #101014 0%, #0A0A0F 100%)" }}
        >
          <div className="w-full max-w-[1300px]">
            <h2
              ref={mobileQuoteTextRef}
              className="font-anton text-[clamp(30px,8vw,56px)] uppercase leading-[0.88] tracking-[0.02em]"
              style={{ color: "#F5E6C8" }}
            >
              {QUOTE.split(" ").map((word, wordIndex, arr) => (
                <span key={wordIndex} style={{ display: "inline" }}>
                  <span style={{ display: "inline-flex" }}>
                    {Array.from(word).map((char, charIndex) => (
                      <span key={`${wordIndex}-${charIndex}`} className="inline-block overflow-hidden">
                        <span className="quote-char inline-block will-change-transform" style={{ color: "#F5E6C8" }}>
                          {char}
                        </span>
                      </span>
                    ))}
                  </span>
                  {wordIndex !== arr.length - 1 && (
                    <span className="inline-block overflow-hidden">
                      <span className="quote-char inline-block will-change-transform" style={{ color: "#F5E6C8" }}>
                        {"\u00A0"}
                      </span>
                    </span>
                  )}
                </span>
              ))}
            </h2>

            <div ref={mobileAttributionRef} className="mt-9 flex flex-col items-center">
              <span className="font-inter text-sm uppercase tracking-[0.18em]"
                style={{ color: "rgba(245,230,200,0.58)" }}>
                ITACHI UCHIHA
              </span>
              <span className="mt-3 h-[2px] w-16"
                style={{ background: "linear-gradient(90deg, transparent, #FF5A2A, transparent)" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
