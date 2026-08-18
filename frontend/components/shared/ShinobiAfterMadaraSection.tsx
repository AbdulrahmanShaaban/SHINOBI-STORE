"use client";

import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ---- Marquee ---- */

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
        className="flex w-max will-change-transform py-5 md:py-7"
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

/* ---- Showcase panels ---- */

type Character = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  subline: string;
  image: string;
  alt: string;
};

const CHARACTERS: Character[] = [
  {
    number: "01",
    eyebrow: "THE FOURTH HOKAGE",
    title: "MINATO NAMIKAZE",
    description:
      "The Yellow Flash. Precision, speed, and a will strong enough to protect everyone behind him.",
    subline: "THE YELLOW FLASH",
    image: "/minato-default.png",
    alt: "Minato Namikaze",
  },
  {
    number: "02",
    eyebrow: "THE SHARINGAN",
    title: "ITACHI UCHIHA",
    description:
      "A shinobi who carried the weight of an entire clan, choosing sacrifice over recognition.",
    subline: "THE MAN BEHIND THE CALM",
    image: "/itachi-default.png",
    alt: "Itachi Uchiha",
  },
  {
    number: "03",
    eyebrow: "THE MAN BEHIND THE MASK",
    title: "OBITO UCHIHA",
    description:
      "A broken dream, a borrowed identity, and a world he wanted to reshape in his own image.",
    subline: "THE MASKED SHINOBI",
    image: "/obito-default.png",
    alt: "Obito Uchiha",
  },
];

const INTRO_WIDTH = "w-[88vw] md:w-[72vw] xl:w-[68vw]";
const CARD_WIDTH = "w-[82vw] md:w-[68vw] xl:w-[64vw]";

function IntroPanel() {
  const c = CHARACTERS[0];
  return (
    <article
      className={`showcase-panel showcase-intro relative flex h-[68svh] min-h-[520px] shrink-0 ${INTRO_WIDTH} overflow-hidden rounded-2xl border`}
      style={{
        borderColor: "rgba(245,230,200,0.10)",
        backgroundColor: "#101014",
      }}
    >
      <div className="flex h-full w-full">
        {/* Left: heading + description + CTA */}
        <div className="relative z-10 flex w-[45%] flex-col justify-center px-8 py-10 md:px-12 lg:px-16">
          <h2
            className="showcase-intro-title font-anton text-[clamp(48px,7vw,100px)] uppercase leading-[0.85] tracking-[0.01em]"
            style={{ color: "#F5E6C8" }}
          >
            BEYOND
            <br />
            <span style={{
              background: "linear-gradient(90deg, #FF5A2A, #FF8C42)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              THE SHINOBI.
            </span>
          </h2>

          <p
            className="showcase-intro-copy mt-6 max-w-[380px] font-inter text-sm leading-relaxed md:mt-8 md:text-base"
            style={{ color: "rgba(245,230,200,0.58)" }}
          >
            Legends, symbols, and moments that shaped the world. Explore the
            icons that made Naruto unforgettable.
          </p>

          <div className="showcase-intro-cta mt-8 flex items-center gap-4 md:mt-10">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border md:h-14 md:w-14"
              style={{ borderColor: "rgba(245,230,200,0.20)" }}
              aria-hidden="true"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#F5E6C8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <div className="font-anton text-xs uppercase tracking-[0.22em] md:text-sm" style={{ color: "#F5E6C8" }}>
                SWIPE TO DISCOVER
              </div>
              <div className="mt-1 font-inter text-[9px] uppercase tracking-[0.22em] md:text-[10px]" style={{ color: "#FF5A2A" }}>
                INTERACTIVE JOURNEY
              </div>
            </div>
          </div>
        </div>

        {/* Right: character preview card */}
        <div className="flex w-[55%] items-center justify-center p-6 md:p-8 lg:p-10">
          <div
            className="relative flex h-full w-full max-w-[560px] overflow-hidden rounded-xl border"
            style={{
              borderColor: "rgba(245,230,200,0.10)",
              backgroundColor: "#121218",
            }}
          >
            {/* Background number */}
            <span
              className="pointer-events-none absolute bottom-[-5%] right-[-2%] z-0 select-none font-anton text-[22vw] leading-none"
              style={{ color: "#8B1A1A", opacity: 0.06 }}
              aria-hidden="true"
            >
              {c.number}
            </span>

            {/* Image */}
            <div className="relative h-full w-[50%] overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: "radial-gradient(circle at 55% 48%, rgba(255,90,42,0.10), transparent 63%)" }}
              />
              <Image
                src={c.image} alt={c.alt} fill
                sizes="(max-width: 767px) 40vw, 28vw"
                className="relative z-10 object-contain object-bottom"
                style={{ filter: "drop-shadow(0 28px 55px rgba(0,0,0,0.55))" }}
              />
            </div>

            {/* Text */}
            <div className="relative z-20 flex w-[50%] flex-col justify-center px-5 py-6 md:px-7">
              <span className="font-inter text-[9px] uppercase tracking-[0.18em] md:text-[10px]" style={{ color: "#FF5A2A" }}>
                {c.eyebrow}
              </span>
              <h3 className="mt-2 font-anton text-[clamp(22px,3vw,36px)] uppercase leading-[0.88] tracking-[0.02em] md:mt-3"
                style={{ color: "#F5E6C8" }}>
                {c.title}
              </h3>
              <p className="mt-3 font-inter text-[11px] leading-relaxed md:text-xs"
                style={{ color: "rgba(245,230,200,0.50)" }}>
                {c.description}
              </p>
              <span className="mt-3 font-inter text-[8px] uppercase tracking-[0.22em] md:text-[9px]"
                style={{ color: "rgba(245,230,200,0.30)" }}>
                {c.subline}
              </span>
              <div className="mt-4 flex items-center gap-2 font-anton text-[10px] uppercase tracking-[0.20em] md:text-[11px]"
                style={{ color: "#FF5A2A" }}>
                EXPLORE
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function CharacterPanel({ character }: { character: Character }) {
  return (
    <article
      className={`showcase-panel showcase-character relative flex h-[68svh] min-h-[520px] shrink-0 ${CARD_WIDTH} overflow-hidden rounded-2xl border`}
      style={{ borderColor: "rgba(245,230,200,0.10)", backgroundColor: "#121218" }}
    >
      {/* Background number */}
      <span
        className="showcase-number pointer-events-none absolute bottom-[-5%] right-[-2%] z-0 select-none font-anton text-[28vw] leading-none md:text-[18vw]"
        style={{ color: "#8B1A1A", opacity: 0.06 }}
        aria-hidden="true"
      >
        {character.number}
      </span>

      <div className="relative flex h-full w-full">
        {/* Left: image */}
        <div className="showcase-visual relative flex w-[45%] items-end justify-center overflow-hidden md:items-center">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 55% 48%, rgba(255,90,42,0.10), transparent 63%)" }}
          />
          <Image
            src={character.image}
            alt={character.alt}
            fill
            sizes="(max-width: 767px) 50vw, 32vw"
            className="relative z-10 object-contain object-bottom md:object-right"
            style={{ filter: "drop-shadow(0 28px 55px rgba(0,0,0,0.55))" }}
          />
        </div>

        {/* Right: text content */}
        <div className="showcase-content relative z-20 flex w-[55%] flex-col justify-center px-8 py-8 md:px-12 lg:px-14">
          <span
            className="showcase-eyebrow font-inter text-[10px] uppercase tracking-[0.18em] md:text-xs"
            style={{ color: "#FF5A2A" }}
          >
            {character.eyebrow}
          </span>

          <h3
            className="showcase-title mt-3 max-w-[520px] font-anton text-[clamp(32px,5.5vw,72px)] uppercase leading-[0.87] tracking-[0.02em] md:mt-4"
            style={{ color: "#F5E6C8" }}
          >
            {character.title}
          </h3>

          <p
            className="showcase-desc mt-4 max-w-[440px] font-inter text-sm leading-relaxed md:mt-5 md:text-base"
            style={{ color: "rgba(245,230,200,0.58)" }}
          >
            {character.description}
          </p>

          <span
            className="showcase-subline mt-4 font-inter text-[9px] uppercase tracking-[0.24em] md:mt-6 md:text-[10px]"
            style={{ color: "rgba(245,230,200,0.36)" }}
          >
            {character.subline}
          </span>

          <div
            className="showcase-cta mt-6 flex items-center gap-3 font-anton text-xs uppercase tracking-[0.24em] md:mt-8 md:text-sm"
            style={{ color: "#FF5A2A" }}
          >
            EXPLORE
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---- Quote ---- */

const QUOTE = "THOSE WHO CANNOT ACKNOWLEDGE THEMSELVES WILL EVENTUALLY FAIL.";
const QUOTE_CHARS = Array.from(QUOTE);

/* ---- Main ---- */

export default function ShinobiAfterMadaraSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const quoteTextRef = useRef<HTMLHeadingElement>(null);
  const attributionRef = useRef<HTMLDivElement>(null);
  const quoteWrapRef = useRef<HTMLDivElement>(null);
  const showcaseHeadingRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackWrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const pin = pinRef.current;
      const quoteText = quoteTextRef.current;
      const attribution = attributionRef.current;
      const quoteWrap = quoteWrapRef.current;
      const showcaseHeading = showcaseHeadingRef.current;
      const stage = stageRef.current;
      const trackWrap = trackWrapRef.current;
      const track = trackRef.current;

      if (!pin || !quoteText || !stage || !track) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        const chars = quoteText.querySelectorAll<HTMLElement>(".quote-char");
        gsap.set(chars, { clearProps: "all" });
        if (attribution) gsap.set(attribution, { clearProps: "all" });
        if (quoteWrap) gsap.set(quoteWrap, { clearProps: "all" });
        if (showcaseHeading) gsap.set(showcaseHeading, { clearProps: "all" });
        if (trackWrap) gsap.set(trackWrap, { clearProps: "all" });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
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
        if (quoteWrap) gsap.set(quoteWrap, { opacity: 1 });
        if (showcaseHeading) gsap.set(showcaseHeading, { opacity: 0 });
        if (trackWrap) gsap.set(trackWrap, { opacity: 0 });

        const CHARACTER_OFFSET = 0.065;

        const getQuoteDistance = () =>
          window.innerWidth < 768 ? 1200 : 1800;

        const getShowcaseDistance = () => {
          const trackWidth = track.scrollWidth;
          return Math.max(0, trackWidth - window.innerWidth);
        };

        const SCROLL_SPEED_FACTOR = 2;

        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: {
            trigger: stage,
            pin: pin,
            start: "top top",
            end: () => `+=${getQuoteDistance() + getShowcaseDistance() * SCROLL_SPEED_FACTOR}`,
            scrub: 1,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: -1,
          },
        });

        /* Phase 1: quote character reveal */
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

        /* Phase 2: crossfade quote out, showcase heading in */
        tl.to({}, { duration: 0.3 });
        if (quoteWrap) {
          tl.to(quoteWrap, { opacity: 0, duration: 0.12, ease: "power2.inOut" });
        }
        if (showcaseHeading) {
          tl.to(showcaseHeading, { opacity: 1, duration: 0.08, ease: "power2.out" });
        }
        if (trackWrap) {
          tl.to(trackWrap, { opacity: 1, duration: 0.1, ease: "power2.out" }, "<");
        }
        if (showcaseHeading) {
          tl.to(showcaseHeading, { opacity: 0, duration: 0.08, ease: "power2.inOut" });
        }

        /* Phase 3: horizontal showcase scroll */
        const getDistance = () => getShowcaseDistance();
        const horizontalTween = gsap.to(track, {
          x: () => -getDistance(),
          ease: "none",
        });
        tl.add(horizontalTween);

        /* Phase 4: per-panel reveals */
        const panels = Array.from(
          track.querySelectorAll<HTMLElement>(".showcase-panel")
        );

        panels.forEach((panel, index) => {
          const isIntro = panel.classList.contains("showcase-intro");
          const sel = (cls: string) => panel.querySelector<HTMLElement>(cls);
          const elements = isIntro
            ? {
                eyebrow: sel(".showcase-intro-eyebrow"),
                title: sel(".showcase-intro-title"),
                copy: sel(".showcase-intro-copy"),
                cta: sel(".showcase-intro-cta"),
                visual: sel(".showcase-intro-visual"),
              }
            : {
                eyebrow: sel(".showcase-eyebrow"),
                title: sel(".showcase-title"),
                copy: sel(".showcase-desc"),
                cta: sel(".showcase-cta"),
                visual: sel(".showcase-visual"),
              };

          const panelTl = gsap.timeline({
            scrollTrigger: {
              containerAnimation: horizontalTween,
              trigger: panel,
              start: index === 0 ? "left 100%" : "left 90%",
              end: index === 0 ? "left 68%" : "left 48%",
              scrub: 0.7,
            },
          });

          if (elements.eyebrow) {
            panelTl.fromTo(elements.eyebrow, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 0);
          }
          if (elements.title) {
            panelTl.fromTo(elements.title, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.05);
          }
          if (elements.copy) {
            panelTl.fromTo(elements.copy, { y: 22, opacity: 0 }, { y: 0, opacity: 0.82, duration: 0.55 }, 0.16);
          }
          if (elements.cta) {
            panelTl.fromTo(elements.cta, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.28);
          }
          if (elements.visual) {
            panelTl.fromTo(elements.visual, { x: 42, opacity: 0.65, scale: 0.97 }, { x: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }, 0);
          }
        });
      });

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden bg-[#101014]">
      {/* Marquees */}
      <div className="pt-[clamp(96px,12vh,180px)]">
        {MARQUEE_ROWS.map((row) => (
          <MarqueeRow key={row.text} row={row} />
        ))}
      </div>

      {/* Single pinned container: quote + showcase */}
      <div ref={stageRef} className="relative">
        <div
          ref={pinRef}
          className="relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden"
        >
          {/* Quote */}
          <div ref={quoteWrapRef} className="absolute inset-0 z-20 flex items-center justify-center px-6 text-center">
            <div className="w-full max-w-[1300px]">
              <h2
                ref={quoteTextRef}
                className="font-anton text-[clamp(34px,10vw,68px)] uppercase leading-[0.88] tracking-[0.02em] md:text-[clamp(52px,6.5vw,120px)]"
                style={{ color: "#F5E6C8" }}
              >
                {QUOTE_CHARS.map((char, index) => (
                  <span key={index} className="inline-block overflow-hidden">
                    <span className="quote-char inline-block will-change-transform" style={{ color: "#F5E6C8" }}>
                      {char === " " ? "\u00A0" : char}
                    </span>
                  </span>
                ))}
              </h2>

              <div ref={attributionRef} className="mt-9 flex flex-col items-center md:mt-12">
                <span className="font-inter text-sm uppercase tracking-[0.18em] md:text-base"
                  style={{ color: "rgba(245,230,200,0.58)" }}>
                  <span style={{ color: "#FF5A2A" }}>\u2014</span> ITACHI UCHIHA
                </span>
                <span className="mt-3 h-[2px] w-16 md:w-24"
                  style={{ background: "linear-gradient(90deg, transparent, #FF5A2A, transparent)" }} />
              </div>
            </div>
          </div>

          {/* Showcase heading (appears during crossfade) */}
          <div ref={showcaseHeadingRef} className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center" style={{ opacity: 0 }}>
            <h2 className="font-anton text-[clamp(48px,7vw,112px)] uppercase leading-[0.86] tracking-[0.02em]"
              style={{ color: "#F5E6C8" }}>
              THE ICONS
            </h2>
          </div>

          {/* Horizontal showcase track — hidden until crossfade */}
          <div ref={trackWrapRef} className="absolute inset-0 z-0 flex items-center overflow-hidden"
            style={{
              opacity: 0,
              backgroundImage: "repeating-linear-gradient(135deg, rgba(245,230,200,0.035) 0 1px, transparent 1px 42px)",
            }}>
            <div ref={trackRef} className="flex w-max items-center gap-5 px-4 will-change-transform md:gap-8 md:px-10 xl:gap-10 xl:px-14">
              <IntroPanel />
              <CharacterPanel character={CHARACTERS[1]} />
              <CharacterPanel character={CHARACTERS[2]} />
              <div aria-hidden="true" className="h-1 w-[8vw] shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
