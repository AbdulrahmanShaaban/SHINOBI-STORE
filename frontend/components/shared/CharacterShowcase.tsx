// components/shared/CharacterShowcase.tsx

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
  const firstCharacter = CHARACTERS[0];

  return (
    <article
      className={`
        showcase-panel showcase-intro
        relative
        flex
        h-[68svh]
        min-h-[520px]
        shrink-0
        ${INTRO_WIDTH}
        overflow-hidden
        rounded-2xl
        border
      `}
      style={{
        borderColor: "rgba(245,230,200,0.10)",
        backgroundColor: "#101014",
      }}
    >
      <div className="flex h-full w-full flex-col md:flex-row">
        {/* Intro text */}
        <div className="relative z-10 flex w-full flex-col justify-center px-7 py-10 md:w-[48%] md:px-10 lg:px-12 xl:px-16">
          <span
            className="showcase-intro-eyebrow font-inter text-[10px] uppercase tracking-[0.28em] md:text-xs"
            style={{ color: "#FF5A2A" }}
          >
            THE ICONS
          </span>

          <h2
            className="showcase-intro-title mt-4 font-anton text-[clamp(56px,8vw,112px)] uppercase leading-[0.82] tracking-[0.01em]"
            style={{ color: "#F5E6C8" }}
          >
            BEYOND
            <br />
            THE SHINOBI.
          </h2>

          <p
            className="showcase-intro-copy mt-6 max-w-[440px] font-inter text-sm leading-relaxed md:mt-8 md:text-base lg:text-lg"
            style={{ color: "rgba(245,230,200,0.58)" }}
          >
            Legends, symbols, and moments that shaped the world. Explore the
            icons that made Naruto unforgettable.
          </p>

          <div className="showcase-intro-cta mt-7 flex items-center gap-4 md:mt-10 md:gap-5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border md:h-14 md:w-14"
              style={{ borderColor: "rgba(245,230,200,0.20)" }}
              aria-hidden="true"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F5E6C8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <div>
              <div
                className="font-anton text-xs uppercase tracking-[0.22em] md:text-sm"
                style={{ color: "#F5E6C8" }}
              >
                SWIPE TO DISCOVER
              </div>

              <div
                className="mt-1 font-inter text-[9px] uppercase tracking-[0.22em] md:text-[10px]"
                style={{ color: "#FF5A2A" }}
              >
                INTERACTIVE JOURNEY
              </div>
            </div>
          </div>
        </div>

        {/* Minato preview */}
        <div className="showcase-intro-visual relative flex h-full w-full items-end justify-center overflow-hidden md:w-[52%] md:items-center md:justify-end">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at center, rgba(255,90,42,0.13), transparent 64%)",
            }}
          />

          <Image
            src={firstCharacter.image}
            alt={firstCharacter.alt}
            fill
            priority={false}
            sizes="(max-width: 767px) 75vw, (max-width: 1279px) 38vw, 32vw"
            className="relative z-10 object-contain object-bottom md:object-right"
            style={{
              filter: "drop-shadow(0 28px 55px rgba(0,0,0,0.55))",
            }}
          />

          <span
            className="pointer-events-none absolute bottom-2 right-4 z-20 select-none font-anton text-[24vw] leading-none md:right-6 md:text-[15vw]"
            style={{ color: "#8B1A1A", opacity: 0.08 }}
            aria-hidden="true"
          >
            {firstCharacter.number}
          </span>
        </div>
      </div>
    </article>
  );
}

function CharacterPanel({ character }: { character: Character }) {
  return (
    <article
      className={`
        showcase-panel showcase-character
        relative
        flex
        h-[68svh]
        min-h-[520px]
        shrink-0
        ${CARD_WIDTH}
        overflow-hidden
        rounded-2xl
        border
      `}
      style={{
        borderColor: "rgba(245,230,200,0.10)",
        backgroundColor: "#121218",
      }}
    >
      {/* Background number */}
      <span
        className="showcase-number pointer-events-none absolute bottom-[-5%] right-[-2%] z-0 select-none font-anton text-[30vw] leading-none md:text-[18vw]"
        style={{ color: "#8B1A1A", opacity: 0.08 }}
        aria-hidden="true"
      >
        {character.number}
      </span>

      <div className="relative flex h-full w-full flex-col md:flex-row">
        {/* Text */}
        <div className="showcase-content relative z-20 flex h-[54%] w-full flex-col justify-center px-7 py-7 md:h-full md:w-[56%] md:px-10 lg:px-12 xl:px-14">
          <span
            className="showcase-eyebrow font-inter text-[10px] uppercase tracking-[0.18em] md:text-xs"
            style={{ color: "#FF5A2A" }}
          >
            {character.eyebrow}
          </span>

          <h3
            className="showcase-title mt-3 max-w-[620px] font-anton text-[clamp(40px,6.5vw,82px)] uppercase leading-[0.87] tracking-[0.02em] md:mt-4"
            style={{ color: "#F5E6C8" }}
          >
            {character.title}
          </h3>

          <p
            className="showcase-desc mt-4 max-w-[510px] font-inter text-sm leading-relaxed md:mt-5 md:text-base lg:text-lg"
            style={{ color: "rgba(245,230,200,0.58)" }}
          >
            {character.description}
          </p>

          <span
            className="showcase-subline mt-5 font-inter text-[9px] uppercase tracking-[0.24em] md:mt-7 md:text-[10px]"
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

        {/* Artwork */}
        <div className="showcase-visual relative flex h-[46%] w-full items-end justify-center overflow-hidden md:h-full md:w-[44%] md:items-center md:justify-end">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 55% 48%, rgba(255,90,42,0.10), transparent 63%)",
            }}
          />

          <Image
            src={character.image}
            alt={character.alt}
            fill
            sizes="(max-width: 767px) 65vw, (max-width: 1279px) 36vw, 30vw"
            className="relative z-10 object-contain object-bottom md:object-right"
            style={{
              filter: "drop-shadow(0 28px 55px rgba(0,0,0,0.55))",
            }}
          />
        </div>
      </div>
    </article>
  );
}

export default function CharacterShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const stage = stageRef.current;
      const track = trackRef.current;

      if (!stage || !track) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(track, { clearProps: "transform" });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const getDistance = () =>
          Math.max(0, track.scrollWidth - window.innerWidth);

        const horizontalTween = gsap.to(track, {
          x: () => -getDistance(),
          ease: "none",
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            end: () => `+=${getDistance()}`,
            pin: stage,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: -1,
          },
        });

        const panels = Array.from(
          track.querySelectorAll<HTMLElement>(".showcase-panel")
        );

        panels.forEach((panel, index) => {
          const isIntro = panel.classList.contains("showcase-intro");

          const elements = isIntro
            ? {
                eyebrow: panel.querySelector<HTMLElement>(
                  ".showcase-intro-eyebrow"
                ),
                title: panel.querySelector<HTMLElement>(
                  ".showcase-intro-title"
                ),
                copy: panel.querySelector<HTMLElement>(
                  ".showcase-intro-copy"
                ),
                cta: panel.querySelector<HTMLElement>(
                  ".showcase-intro-cta"
                ),
                visual: panel.querySelector<HTMLElement>(
                  ".showcase-intro-visual"
                ),
              }
            : {
                eyebrow: panel.querySelector<HTMLElement>(
                  ".showcase-eyebrow"
                ),
                title: panel.querySelector<HTMLElement>(
                  ".showcase-title"
                ),
                copy: panel.querySelector<HTMLElement>(".showcase-desc"),
                cta: panel.querySelector<HTMLElement>(".showcase-cta"),
                visual: panel.querySelector<HTMLElement>(
                  ".showcase-visual"
                ),
              };

          if (
            !elements.eyebrow &&
            !elements.title &&
            !elements.copy &&
            !elements.cta &&
            !elements.visual
          ) {
            return;
          }

          const reveal = {
            scrollTrigger: {
              containerAnimation: horizontalTween,
              trigger: panel,
              start: index === 0 ? "left 100%" : "left 90%",
              end: index === 0 ? "left 68%" : "left 48%",
              scrub: 0.7,
            },
          };

          const tl = gsap.timeline({
            defaults: {
              ease: "power3.out",
            },
            ...reveal,
          });

          if (elements.eyebrow) {
            tl.fromTo(
              elements.eyebrow,
              { y: 18, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.45 },
              0
            );
          }

          if (elements.title) {
            tl.fromTo(
              elements.title,
              { y: 36, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.7 },
              0.05
            );
          }

          if (elements.copy) {
            tl.fromTo(
              elements.copy,
              { y: 22, opacity: 0 },
              { y: 0, opacity: 0.82, duration: 0.55 },
              0.16
            );
          }

          if (elements.cta) {
            tl.fromTo(
              elements.cta,
              { y: 16, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.5 },
              0.28
            );
          }

          if (elements.visual) {
            tl.fromTo(
              elements.visual,
              {
                x: 42,
                opacity: 0.65,
                scale: 0.97,
              },
              {
                x: 0,
                opacity: 1,
                scale: 1,
                duration: 0.8,
                ease: "power2.out",
              },
              0
            );
          }
        });

        return () => {
          horizontalTween.scrollTrigger?.kill();
          horizontalTween.kill();
        };
      });

      return () => {
        mm.revert();
      };
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="relative mt-[clamp(280px,24vh,560px)] w-full overflow-hidden bg-[#101014]"
    >
      {/* Section heading */}
      <div className="mx-auto w-full px-6 pb-12 text-center md:px-10 md:pb-16 xl:px-14">
        <h2
          className="font-anton text-[clamp(48px,7vw,112px)] uppercase leading-[0.86] tracking-[0.02em]"
          style={{ color: "#F5E6C8" }}
        >
          THE ICONS
        </h2>
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-[100svh] items-center overflow-hidden border-y"
        style={{
          borderColor: "rgba(245,230,200,0.10)",
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(245,230,200,0.035) 0 1px, transparent 1px 42px)",
        }}
      >
        <div
          ref={trackRef}
          className="flex w-max items-center gap-5 px-4 will-change-transform md:gap-8 md:px-10 xl:gap-10 xl:px-14"
        >
          <IntroPanel />

          <CharacterPanel character={CHARACTERS[1]} />

          <CharacterPanel character={CHARACTERS[2]} />

          <div
            aria-hidden="true"
            className="h-1 w-[8vw] shrink-0"
          />
        </div>
      </div>

      <div className="h-24 md:h-36" />
    </section>
  );
}