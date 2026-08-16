"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CharacterShowcase from "@/components/shared/CharacterShowcase";

gsap.registerPlugin(ScrollTrigger);

const MARQUEE_ROWS = [
  {
    text: "SHINOBI • CHAKRA • JUTSU • WILL OF FIRE •",
    direction: "left" as const,
    speed: 110,
    theme: "dark" as const,
  },
  {
    text: "LEAF • UCHIHA • AKATSUKI • HOKAGE •",
    direction: "right" as const,
    speed: 90,
    theme: "accent" as const,
  },
];

const MARQUEE_COPIES = 4;

const QUOTE =
  "THOSE WHO CANNOT ACKNOWLEDGE THEMSELVES WILL EVENTUALLY FAIL.";

const QUOTE_CHARS = Array.from(QUOTE);

function MarqueeRow({
  row,
}: {
  row: (typeof MARQUEE_ROWS)[number];
}) {
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
        const getCopyWidth = () =>
          track.scrollWidth / MARQUEE_COPIES;

        const getSpeed = () =>
          row.speed * (window.innerWidth < 768 ? 0.7 : 1);

        const getDuration = () => getCopyWidth() / getSpeed();

        const tween = gsap.fromTo(
          track,
          {
            xPercent: row.direction === "left" ? 0 : -25,
          },
          {
            xPercent: row.direction === "left" ? -25 : 0,
            duration: getDuration(),
            ease: "none",
            repeat: -1,
          }
        );

        const resizeObserver = new ResizeObserver(() => {
          tween.duration(getDuration());
        });

        resizeObserver.observe(track);

        return () => {
          resizeObserver.disconnect();
          tween.kill();
        };
      });

      return () => {
        mm.revert();
      };
    },
    {
      scope: rowRef,
      dependencies: [row],
    }
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
        {Array.from({ length: MARQUEE_COPIES }).map((_, index) => (
          <span
            key={index}
            className={`font-anton uppercase leading-none tracking-[0.02em] ${
              row.theme === "accent"
                ? "text-[#101014]"
                : "text-[#F5E6C8]"
            }`}
            style={{
              fontSize: "clamp(52px, 6.4vw, 120px)",
            }}
          >
            {row.text}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ShinobiAfterMadaraSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const quoteSectionRef = useRef<HTMLDivElement>(null);
  const quotePinRef = useRef<HTMLDivElement>(null);
  const quoteTextRef = useRef<HTMLHeadingElement>(null);
  const attributionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const quoteSection = quoteSectionRef.current;
      const quotePin = quotePinRef.current;
      const quoteText = quoteTextRef.current;
      const attribution = attributionRef.current;

      if (!quoteSection || !quotePin || !quoteText) return;

      const chars = Array.from(
        quoteText.querySelectorAll<HTMLSpanElement>(".quote-char")
      );

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(chars, { clearProps: "all" });

        if (attribution) {
          gsap.set(attribution, { clearProps: "all" });
        }
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(chars, {
          opacity: 0,
          yPercent: 120,
          rotationX: 70,
          transformPerspective: 800,
          filter: "blur(8px)",
          color: "#3A3A40",
        });

        if (attribution) {
          gsap.set(attribution, {
            opacity: 0,
            y: 20,
          });
        }

        const isMobile = window.matchMedia(
          "(max-width: 767px)"
        ).matches;

        const scrollDistance = isMobile ? 1200 : 1800;
        const CHARACTER_OFFSET = 0.065;

        const tl = gsap.timeline({
          defaults: {
            ease: "power3.out",
          },
          scrollTrigger: {
            trigger: quoteSection,
            pin: quotePin,
            start: "top top",
            end: () => `+=${scrollDistance}`,
            scrub: 1,
            pinSpacing: true,
            anticipatePin: 1,
            pinReparent: true,
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
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              ease: "power2.out",
            },
            "+=0.15"
          );
        }
      });

      return () => {
        mm.revert();
      };
    },
    {
      scope: sectionRef,
    }
  );

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-[#101014]"
    >
      {/* Marquees */}
      <div className="pt-[clamp(96px,12vh,180px)]">
        {MARQUEE_ROWS.map((row) => (
          <MarqueeRow key={row.text} row={row} />
        ))}
      </div>

      {/* Itachi quote — pinned character-by-character reveal */}
      <div
        ref={quoteSectionRef}
        className="
          relative
          mt-[clamp(140px,18vh,280px)]
          min-h-[100svh]
          w-full
        "
      >
        <div
          ref={quotePinRef}
          className="
            relative
            flex
            min-h-[100svh]
            w-full
            items-center
            justify-center
            overflow-hidden
            px-6
            text-center
          "
        >
          <div className="w-full max-w-[1300px]">
            <h2
              ref={quoteTextRef}
              className="
                font-anton
                text-[clamp(34px,10vw,68px)]
                uppercase
                leading-[0.88]
                tracking-[0.02em]
                md:text-[clamp(52px,6.5vw,120px)]
              "
              style={{ color: "#F5E6C8" }}
            >
              {QUOTE_CHARS.map((char, index) => (
                <span
                  key={index}
                  className="inline-block overflow-hidden"
                >
                  <span
                    className="quote-char inline-block will-change-transform"
                    style={{ color: "#F5E6C8" }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                </span>
              ))}
            </h2>

            <div
              ref={attributionRef}
              className="
                mt-9
                flex
                flex-col
                items-center
                md:mt-12
              "
            >
              <span
                className="
                  font-inter
                  text-sm
                  uppercase
                  tracking-[0.18em]
                  md:text-base
                "
                style={{
                  color: "rgba(245,230,200,0.58)",
                }}
              >
                <span style={{ color: "#FF5A2A" }}>—</span>{" "}
                ITACHI UCHIHA
              </span>

              <span
                className="mt-3 h-[2px] w-16 md:w-24"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #FF5A2A, transparent)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Character Showcase — THE ICONS horizontal showcase */}
      <CharacterShowcase />
    </section>
  );
}