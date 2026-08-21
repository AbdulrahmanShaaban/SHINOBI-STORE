"use client";

import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
    image: "/minato.png",
    alt: "Minato Namikaze",
  },
  {
    number: "02",
    eyebrow: "THE AKATSUKI FOUNDER",
    title: "PAIN NAGATO",
    description:
      "Those who do not understand true pain can never understand true peace.",
    subline: "THE SIX PATHS OF PAIN",
    image: "/pain.png",
    alt: "Pain Nagato",
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

const INTRO_WIDTH = "w-[88vw] md:w-[45vw] lg:w-[40vw] xl:w-[35vw]";
const CARD_WIDTH = "w-[82vw] md:w-[74vw] lg:w-[68vw] xl:w-[64vw]";

function IntroPanel() {
  return (
    <article
      className={`showcase-panel showcase-intro relative flex h-[68svh] min-h-[420px] md:min-h-[520px] shrink-0 ${INTRO_WIDTH} overflow-hidden rounded-2xl border`}
      style={{
        borderColor: "rgba(245,230,200,0.10)",
        backgroundColor: "#101014",
      }}
    >
      <div className="flex h-full w-full">
        <div className="relative z-10 flex w-full flex-col justify-center px-8 py-10 md:px-12 lg:px-16">
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
      </div>
    </article>
  );
}

function CharacterPanel({ character }: { character: Character }) {
  return (
    <article
      className={`showcase-panel showcase-character relative flex h-[68svh] min-h-[420px] md:min-h-[520px] shrink-0 ${CARD_WIDTH} overflow-hidden rounded-2xl border`}
      style={{ borderColor: "rgba(245,230,200,0.10)", backgroundColor: "#121218" }}
    >
      <span
        className="showcase-number pointer-events-none absolute bottom-[-5%] right-[-2%] z-0 select-none font-anton text-[28vw] leading-none md:text-[18vw]"
        style={{ color: "#8B1A1A", opacity: 0.06 }}
        aria-hidden="true"
      >
        {character.number}
      </span>
      <div className="relative flex h-full w-full">
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

export default function CharacterShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const stage = stageRef.current;
      const track = trackRef.current;
      if (!stage || !track) return;

      if (headingRef.current) {
        gsap.fromTo(
          headingRef.current,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: headingRef.current,
              start: "top 85%",
              once: true,
            },
          }
        );
      }

      const getDistance = () =>
        Math.max(0, track.scrollWidth - window.innerWidth);

      const SCROLL_SPEED_FACTOR = 2;
      const getPinDistance = () => getDistance() * SCROLL_SPEED_FACTOR;

      gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: () => `+=${getPinDistance()}`,
          pin: stage,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: -3,
        },
      });

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reducedMotion) {
        // Per-panel reveals driven by the horizontal tween
        const panels = Array.from(
          track.querySelectorAll<HTMLElement>(".showcase-panel")
        );
        panels.forEach((panel, index) => {
          const isIntro = panel.classList.contains("showcase-intro");
          const sel = (cls: string) => panel.querySelector<HTMLElement>(cls);
          const elements = isIntro
            ? { eyebrow: sel(".showcase-intro-eyebrow"), title: sel(".showcase-intro-title"), copy: sel(".showcase-intro-copy"), cta: sel(".showcase-intro-cta"), visual: sel(".showcase-intro-visual") }
            : { eyebrow: sel(".showcase-eyebrow"), title: sel(".showcase-title"), copy: sel(".showcase-desc"), cta: sel(".showcase-cta"), visual: sel(".showcase-visual") };

          const panelTl = gsap.timeline({
            scrollTrigger: {
              trigger: panel,
              start: index === 0 ? "left 80%" : "left 70%",
              end: index === 0 ? "left 40%" : "left 30%",
              scrub: 0.7,
            },
          });

          if (elements.eyebrow) panelTl.fromTo(elements.eyebrow, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 0);
          if (elements.title) panelTl.fromTo(elements.title, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.05);
          if (elements.copy) panelTl.fromTo(elements.copy, { y: 22, opacity: 0 }, { y: 0, opacity: 0.82, duration: 0.55 }, 0.16);
          if (elements.cta) panelTl.fromTo(elements.cta, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.28);
          if (elements.visual) panelTl.fromTo(elements.visual, { x: 42, opacity: 0.65, scale: 0.97 }, { x: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }, 0);
        });
      }
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden bg-[#101014] pt-8 md:pt-0">
      <div
        ref={headingRef}
        className="mx-auto w-full px-6 pb-8 text-center md:px-10 md:pb-10 xl:px-14"
      >
        <h2 className="font-anton text-[clamp(48px,7vw,112px)] uppercase leading-[0.86] tracking-[0.02em]"
          style={{ color: "#F5E6C8" }}>
          THE ICONS
        </h2>
      </div>
      <div ref={stageRef} className="relative flex min-h-[100svh] items-center overflow-hidden border-y"
        style={{
          borderColor: "rgba(245,230,200,0.10)",
          backgroundImage: "repeating-linear-gradient(135deg, rgba(245,230,200,0.035) 0 1px, transparent 1px 42px)",
        }}>
        <div ref={trackRef} className="flex w-max items-center gap-5 px-4 will-change-transform md:gap-8 md:px-10 xl:gap-10 xl:px-14">
          <IntroPanel />
          <CharacterPanel character={CHARACTERS[0]} />
          <CharacterPanel character={CHARACTERS[1]} />
          <CharacterPanel character={CHARACTERS[2]} />
          <div aria-hidden="true" className="h-1 w-[8vw] shrink-0" />
        </div>
      </div>
    </section>
  );
}