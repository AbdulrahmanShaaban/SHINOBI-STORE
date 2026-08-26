"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DEFAULT_CHARACTERS, type Character } from "./showcase-characters";

gsap.registerPlugin(ScrollTrigger);

interface CharacterShowcaseProps {
  /**
   * CMS-resolved panels (featured_characters key). Undefined keeps the
   * hardcoded DEFAULT_CHARACTERS trio — the storefront must render exactly
   * the pre-CMS composition whenever the override is absent or too sparse.
   */
  characters?: Character[];
}

const CARD_WIDTH = "w-[85vw] md:w-[74vw] lg:w-[68vw] xl:w-[64vw]";

function CharacterPanel({ character }: { character: Character }) {
  return (
    <article
      className={`showcase-panel relative flex h-[75svh] min-h-[550px] md:min-h-[520px] shrink-0 ${CARD_WIDTH} overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl`}
    >
      <div className="relative flex flex-col md:flex-row h-full w-full z-10">
        {/* Left Side: Image */}
        <div className="showcase-visual relative flex w-full h-[45%] md:h-full md:w-[45%] items-end justify-center overflow-visible md:items-center bg-[#1A1A1A] md:rounded-l-[2rem]">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,90,42,0.05), transparent 70%)" }}
          />
          <Image
            src={character.image}
            alt={character.alt}
            fill
            sizes="(max-width: 767px) 100vw, 32vw"
            className="relative z-10 object-contain object-bottom md:object-right scale-[1.05] md:scale-100 origin-bottom md:origin-center"
            style={{ filter: "drop-shadow(0 28px 55px rgba(0,0,0,0.65))" }}
          />
        </div>
        
        {/* Right Side: Content (Glassmorphism) */}
        {/* OPACITY CONTROLS: The background opacity of this card is managed here by 'bg-black/60'. Change '60' to a higher/lower number (e.g. 40, 80) to adjust transparency. */}
        <div className="relative z-20 flex w-full h-[55%] md:h-full md:w-[55%] flex-col justify-center p-6 sm:p-8 md:p-10 lg:p-14 bg-black/60 backdrop-blur-xl overflow-hidden">
          {/* Background Number */}
          <span
            className="pointer-events-none absolute bottom-0 right-2 md:bottom-4 md:right-6 z-0 select-none font-anton text-[120px] md:text-[180px] lg:text-[220px] leading-none"
            style={{ color: "#ffffff", opacity: 0.04 }}
            aria-hidden="true"
          >
            {character.number}
          </span>
          
          <div className="relative z-10">
            <span className="showcase-eyebrow font-inter text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-[#F97316]">
              {character.eyebrow}
            </span>
            
            <h3 className="showcase-title mt-1 md:mt-2 font-anton text-[32px] md:text-[40px] lg:text-[52px] xl:text-[60px] uppercase leading-[1.05] tracking-[0.02em] text-white">
              {character.title}
            </h3>
            
            <p className="showcase-desc mt-3 md:mt-5 max-w-[440px] font-inter text-[13px] md:text-[15px] leading-[1.7] text-white/70">
              {character.description}
            </p>

            <div className="mt-5 md:mt-7 flex flex-wrap gap-2 md:gap-3">
              {character.skills.map(skill => (
                <span key={skill} className="px-3 py-1 md:px-4 md:py-1.5 text-[10px] md:text-[11px] font-medium tracking-wide text-white/60 border border-white/20 rounded-full bg-transparent">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          
          {/* CTA — pinned to bottom-left of the glass panel */}
          <Link
            href={`/products?character=${encodeURIComponent(character.slug)}`}
            className="showcase-cta absolute bottom-6 left-6 sm:bottom-8 sm:left-8 md:bottom-10 md:left-10 lg:bottom-14 lg:left-14 z-10 flex items-center gap-3 font-anton text-[14px] md:text-[17px] uppercase tracking-[0.25em] text-white hover:text-[#F97316] transition-colors w-max"
          >
            EXPLORE
            <svg
              className="h-5 w-5 md:h-6 md:w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}

function IntroPanel() {
  return (
    <div className="@container flex w-[90vw] md:w-[45vw] lg:w-[40vw] xl:w-[35vw] flex-col justify-center px-6 md:px-10 lg:px-14 z-0">
      <h2 className="font-anton text-[clamp(48px,8vw,100px)] uppercase leading-[0.85] tracking-[0.01em] text-white whitespace-nowrap md:text-[clamp(44px,calc(100cqw/5.05),96px)]">
        BEYOND
        <br />
        <span className="bg-gradient-to-r from-[#9333EA] via-[#EC4899] to-[#F97316] bg-clip-text text-transparent">
          THE SHINOBI.
        </span>
      </h2>
      <p className="mt-6 md:mt-10 max-w-[420px] font-inter text-[15px] md:text-[17px] leading-[1.8] text-white/60">
        Legends, symbols, and moments that shaped the world. Explore the icons that made Naruto unforgettable.
      </p>
      <div className="mt-10 md:mt-12 flex items-center gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
        <div>
          <div className="font-anton text-xs uppercase tracking-[0.22em] text-white/80 md:text-sm">SWIPE TO DISCOVER</div>
          <div className="mt-1 font-inter text-[9px] uppercase tracking-[0.22em] text-[#F97316] md:text-[10px]">INTERACTIVE JOURNEY</div>
        </div>
      </div>
    </div>
  );
}

export default function CharacterShowcase({ characters }: CharacterShowcaseProps) {
  const list = characters ?? DEFAULT_CHARACTERS;
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const stage = stageRef.current;
      const track = trackRef.current;
      if (!stage || !track) return;

      const getDistance = () =>
        Math.max(0, track.scrollWidth - window.innerWidth);

      const SCROLL_SPEED_FACTOR = 1.5;
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
        const panels = Array.from(
          track.querySelectorAll<HTMLElement>(".showcase-panel")
        );
        panels.forEach((panel) => {
          const sel = (cls: string) => panel.querySelector<HTMLElement>(cls);
          const elements = { 
            eyebrow: sel(".showcase-eyebrow"), 
            title: sel(".showcase-title"), 
            copy: sel(".showcase-desc"), 
            cta: sel(".showcase-cta"), 
            visual: sel(".showcase-visual") 
          };

          const panelTl = gsap.timeline({
            scrollTrigger: {
              trigger: panel,
              start: "left 80%",
              end: "left 30%",
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
    <section ref={sectionRef} className="relative w-full overflow-hidden bg-[#0A0A0A]">
      <div ref={stageRef} className="relative flex min-h-[100svh] items-center overflow-hidden border-y border-white/5">
        
        {/* Fixed Intro Card (First Card) */}
        <div className="absolute left-0 top-0 flex h-full items-center z-0">
          <IntroPanel />
        </div>

        {/* Scrolling Track (Overlays the Intro Card) */}
        <div 
          ref={trackRef} 
          className="relative z-10 flex w-max items-center gap-5 will-change-transform md:gap-8 xl:gap-12"
        >
          {/* Spacer guarantees the first character card is positioned beside the Intro text initially */}
          <div className="w-[90vw] md:w-[45vw] lg:w-[40vw] xl:w-[35vw] shrink-0" aria-hidden="true" />
          {list.map((character) => (
            <CharacterPanel key={`${character.number}-${character.title}`} character={character} />
          ))}
          <div aria-hidden="true" className="h-1 w-[8vw] shrink-0" />
        </div>
        
      </div>
    </section>
  );
}