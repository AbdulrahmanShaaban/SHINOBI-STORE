"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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

const QUOTE = "THOSE WHO CANNOT ACKNOWLEDGE THEMSELVES WILL EVENTUALLY FAIL.";

const QUOTE_CHARS = Array.from(QUOTE);

const SHOWCASE_ITEMS = [
  {
    number: "01",
    title: "THE SHINOBI",
    description: "Legends, symbols, and moments that define the world.",
    image: "/madara-six-paths.png",
  },
  {
    number: "02",
    title: "THE COLLECTION",
    description: "Iconic pieces made for fans who remember every battle.",
    image: "/madara-default.png",
    accentImage: "/kurama.png",
  },
  {
    number: "03",
    title: "THE EXPERIENCE",
    description: "A store built to feel like the world you grew up watching.",
    image: "/naruto-rasengan.png",
    thumbs: [
      "/madara-default.png",
      "/itachi-default.png",
      "/sasuke-default.png",
    ],
  },
];

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
        const copyWidth = () => track.scrollWidth / MARQUEE_COPIES;
        const speed = () =>
          row.speed * (window.innerWidth < 768 ? 0.7 : 1);
        const duration = () => copyWidth() / speed();

        const tween = gsap.fromTo(
          track,
          { xPercent: row.direction === "left" ? 0 : -25 },
          {
            xPercent: row.direction === "left" ? -25 : 0,
            duration: duration(),
            ease: "none",
            repeat: -1,
          }
        );

        const resizeObserver = new ResizeObserver(() => {
          tween.duration(duration());
        });
        resizeObserver.observe(track);

        return () => {
          resizeObserver.disconnect();
        };
      });
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
        {Array.from({ length: MARQUEE_COPIES }).map((_, copyIndex) => (
          <span
            key={copyIndex}
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

function ShowcaseVisual({
  item,
}: {
  item: (typeof SHOWCASE_ITEMS)[number];
}) {
  // Panel 02: desktop = collector card composition, mobile = phone mockup.
  if (item.number === "02") {
    return (
      <>
        <div className="showcase-visual relative hidden md:flex items-center justify-center">
          <div className="relative" style={{ perspective: "1200px" }}>
            <div
              className="relative w-[24vw] max-w-[380px] aspect-[3/4] rounded-xl overflow-hidden"
              style={{
                backgroundColor: "#1A0808",
                border: "2px solid #8B1A1A",
                boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
              }}
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-x-3 bottom-3 h-10 rounded-md flex items-center justify-center font-cinzel font-bold text-[11px] tracking-wide"
                style={{ backgroundColor: "#FF5A2A", color: "#101014" }}
              >
                ADD TO CART — $49.99
              </div>
            </div>
            <div
              className="showcase-floating absolute -bottom-10 -left-10 w-[14vw] max-w-[210px] aspect-[3/4] rounded-lg overflow-hidden border"
              style={{
                borderColor: "rgba(245,230,200,0.20)",
                backgroundColor: "#12121A",
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              }}
            >
              <img
                src={item.accentImage}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Mobile: single centered phone */}
        <div className="showcase-phone relative md:hidden flex items-center justify-center">
          <div
            className="phone-frame relative w-[40vw] max-w-[185px] aspect-[9/18.5] rounded-[1.9rem]"
            style={{
              backgroundColor: "#1C1C22",
              border: "3px solid #26262E",
              boxShadow: "0 30px 60px rgba(0,0,0,0.55)",
            }}
          >
            <div className="absolute inset-[6px] rounded-[1.4rem] overflow-hidden bg-[#101014]">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0A0A0F] to-transparent" />
              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 w-1/2 h-3.5 rounded-full flex items-center justify-center font-cinzel font-bold text-[6px] tracking-wider"
                style={{ backgroundColor: "#FF5A2A", color: "#101014" }}
              >
                $49.99
              </div>
            </div>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-[#2E2E38]" />
          </div>
        </div>
      </>
    );
  }

  // Panel 01: character silhouette.
  if (item.number === "01") {
    return (
      <div className="showcase-visual relative flex items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute w-[50vw] md:w-[26vw] max-w-[380px] aspect-square rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,107,0,0.16) 0%, transparent 70%)",
            filter: "blur(12px)",
          }}
        />
        <img
          src={item.image}
          alt={item.title}
          className="relative z-[1] w-[62vw] md:w-auto md:max-w-[36vw] md:max-h-[64svh] object-contain"
          style={{ filter: "drop-shadow(0 0 50px rgba(255,107,0,0.18))" }}
        />
      </div>
    );
  }

  // Panel 03: store / browser mockup, layered media.
  return (
    <div className="showcase-visual relative flex items-center justify-center">
      <div className="relative" style={{ perspective: "1200px" }}>
        <div
          className="browser relative w-[88vw] md:w-[38vw] max-w-[600px] rounded-xl overflow-hidden"
          style={{
            backgroundColor: "#0A0A0F",
            border: "1px solid rgba(245,230,200,0.15)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ borderColor: "rgba(245,230,200,0.10)" }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A2A]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFB800]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B1A1A]/80" />
            <span
              className="ml-3 flex-1 rounded-full px-3 py-1 font-inter text-[10px] leading-tight"
              style={{
                backgroundColor: "#16161F",
                color: "rgba(245,230,200,0.45)",
              }}
            >
              shinobistore.com
            </span>
          </div>
          <div className="relative h-[38vw] md:h-[14vw] max-h-[180px] overflow-hidden">
            <img
              src="/sky.webp"
              alt=""
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0A0F]" />
            <div className="absolute bottom-3 left-4 font-anton uppercase text-[6vw] md:text-[2.2vw] text-[#F5E6C8]">
              SHINOBI STORE
            </div>
          </div>
          <div className="showcase-thumbs grid grid-cols-3 gap-2 p-3">
            {item.thumbs?.map((thumb) => (
              <div
                key={thumb}
                className="aspect-square rounded-md overflow-hidden bg-[#12121A]"
              >
                <img
                  src={thumb}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
        <div
          className="showcase-floating absolute -bottom-8 -right-6 w-[24vw] md:w-[11vw] max-w-[160px] aspect-[3/4] rounded-lg overflow-hidden border"
          style={{
            borderColor: "rgba(245,230,200,0.20)",
            backgroundColor: "#12121A",
            boxShadow: "0 18px 36px rgba(0,0,0,0.5)",
          }}
        >
          <img
            src={item.image}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

export default function ShinobiAfterMadaraSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const quoteSectionRef = useRef<HTMLDivElement>(null);
  const attributionRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const quoteSection = quoteSectionRef.current;
      const chars = quoteSection
        ? Array.from(
            quoteSection.querySelectorAll<HTMLSpanElement>(".quote-char")
          )
        : [];
      const attribution = attributionRef.current;
      const pin = pinRef.current;
      const track = horizontalRef.current;

      if (!section) return;

      const mm = gsap.matchMedia();

      // ─── Quote: scroll-driven staggered letter reveal ───
      if (quoteSection && chars.length && attribution) {
        mm.add("(prefers-reduced-motion: reduce)", () => {
          gsap.set(chars, { clearProps: "all" });
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
            gsap.set(attribution, { opacity: 0, y: 20 });

            const tl = gsap.timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: {
                trigger: quoteSection,
                start: "top 75%",
                end: "bottom 30%",
                scrub: 0.8,
              },
            });

            tl.to(chars, {
              opacity: 1,
              yPercent: 0,
              rotationX: 0,
              filter: "blur(0px)",
              color: "#F5E6C8",
              stagger: 0.035,
              duration: 0.5,
            }).to(
              attribution,
              {
                opacity: 1,
                y: 0,
                duration: 0.5,
                ease: "power2.out",
              },
              "+=0.55"
            );
        });
      }

      // ─── Horizontal showcase (pinned on all sizes) ───
      if (pin && track) {
        mm.add(
          {
            desktop: "(min-width: 768px)",
            mobile: "(max-width: 767.98px)",
            reduce: "(prefers-reduced-motion: reduce)",
          },
          (context) => {
            const { desktop, reduce } = context.conditions as {
              desktop: boolean;
              mobile: boolean;
              reduce: boolean;
            };

            if (reduce) {
              // Reduced motion: CSS stacks panels vertically, everything static.
              return;
            }

            const panels = Array.from(
              pin.querySelectorAll<HTMLElement>(".showcase-panel")
            );

            const getDistance = () => track.scrollWidth - window.innerWidth;

            const tween = gsap.to(track, {
              x: () => -getDistance(),
              ease: "none",
              scrollTrigger: {
                trigger: pin,
                pin: true,
                scrub: 1,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                end: () => `+=${getDistance()}`,
                refreshPriority: -1,
              },
            });

            panels.forEach((panel, index) => {
              const number = panel.querySelector<HTMLElement>(
                ".showcase-number"
              );
              const title = panel.querySelector<HTMLElement>(
                ".showcase-title"
              );
              const desc = panel.querySelector<HTMLElement>(".showcase-desc");
              const cta = panel.querySelector<HTMLElement>(".showcase-cta");
              const visual = panel.querySelector<HTMLElement>(
                ".showcase-visual"
              );
              const phone = panel.querySelector<HTMLElement>(
                ".showcase-phone"
              );
              const frame = panel.querySelector<HTMLElement>(".phone-frame");
              const floating = panel.querySelector<HTMLElement>(
                ".showcase-floating"
              );
              const thumbs = panel.querySelector<HTMLElement>(
                ".showcase-thumbs"
              );

              const reveal = {
                scrollTrigger: {
                  containerAnimation: tween,
                  trigger: panel,
                  start: "left right",
                  end: "left 55%",
                  scrub: 0.5,
                },
              };

              // Editorial micro-reveal: number → title → description → CTA.
              const tl = gsap.timeline({
                ...reveal,
                defaults: { ease: "power3.out" },
              });
              if (number) {
                tl.fromTo(
                  number,
                  { opacity: 0 },
                  { opacity: 0.14, duration: 0.5 },
                  0
                );
              }
              if (title) {
                tl.fromTo(
                  title,
                  { y: 40, opacity: 0 },
                  { y: 0, opacity: 1, duration: 0.7 },
                  0.1
                );
              }
              if (desc) {
                tl.fromTo(
                  desc,
                  { y: 24, opacity: 0 },
                  { y: 0, opacity: 0.8, duration: 0.7 },
                  0.2
                );
              }
              if (cta) {
                tl.fromTo(
                  cta,
                  { y: 16, opacity: 0 },
                  { y: 0, opacity: 1, duration: 0.6 },
                  0.3
                );
              }

              const isMockup = index === 1;

              if (desktop) {
                if (visual) {
                  const from = isMockup
                    ? { scale: 0.96, rotateY: 5, y: 30, opacity: 0.7 }
                    : { opacity: 0.6, scale: 0.94, x: 50, rotation: 2 };
                  const to = isMockup
                    ? { scale: 1, rotateY: 0, y: 0, opacity: 1 }
                    : { opacity: 1, scale: 1, x: 0, rotation: 0 };
                  gsap.fromTo(visual, from, {
                    ...to,
                    ease: "power2.out",
                    ...reveal,
                  });
                }
                if (floating) {
                  gsap.fromTo(
                    thumbs,
                    { x: 14 },
                    {
                      x: -14,
                      ease: "none",
                      scrollTrigger: {
                        containerAnimation: tween,
                        trigger: panel,
                        start: "left right",
                        end: "left 0%",
                        scrub: 1,
                      },
                    }
                  );
                }
              } else {
                if (phone && frame) {
                  gsap.fromTo(
                    frame,
                    { opacity: 0.6, scale: 0.9, y: 50 },
                    {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      ease: "power3.out",
                      ...reveal,
                    }
                  );
                  gsap.fromTo(
                    phone,
                    { x: 14, rotation: 2 },
                    {
                      x: -14,
                      rotation: -2,
                      ease: "none",
                      scrollTrigger: {
                        containerAnimation: tween,
                        trigger: panel,
                        start: "left right",
                        end: "left 0%",
                        scrub: 1,
                      },
                    }
                  );
                } else if (visual) {
                  gsap.fromTo(
                    visual,
                    { opacity: 0.7, scale: 0.95, x: 30 },
                    { opacity: 1, scale: 1, x: 0, ease: "power2.out", ...reveal }
                  );
                }
              }

              // Final panel eases out as the horizontal motion ends.
              if (index === panels.length - 1) {
                gsap.fromTo(
                  panel.querySelector<HTMLElement>(".showcase-content"),
                  { opacity: 1 },
                  {
                    opacity: 0.9,
                    ease: "none",
                    scrollTrigger: {
                      containerAnimation: tween,
                      trigger: panel,
                      start: "left 45%",
                      end: "left 0%",
                      scrub: 0.8,
                    },
                  }
                );
              }
            });
          }
        );
      }
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#101014] overflow-hidden"
    >
      {/* ─── PHASE 1 + 2 — Marquee stack (breathing gap after Madara) ─── */}
      <div className="pt-[clamp(96px,12vh,180px)]">
        {MARQUEE_ROWS.map((row) => (
          <MarqueeRow key={row.text} row={row} />
        ))}
      </div>

      {/* ─── PHASE 3 — Itachi quote ─── */}
      <div
        ref={quoteSectionRef}
        className="mx-auto max-w-[1300px] px-6 flex flex-col items-center justify-center text-center min-h-[70svh] md:min-h-[80svh] mt-[clamp(140px,18vh,280px)]"
      >
        <h2
          className="font-anton uppercase leading-[0.88] tracking-[0.02em] text-[clamp(34px,10vw,68px)] md:text-[clamp(52px,6.5vw,120px)]"
          style={{ color: "#F5E6C8" }}
        >
          {QUOTE_CHARS.map((char, index) => (
            <span key={index} className="inline-block overflow-hidden">
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
          className="flex flex-col items-center mt-9 md:mt-12"
        >
          <span
            className="font-inter text-sm md:text-base tracking-[0.18em] uppercase"
            style={{ color: "rgba(245,230,200,0.58)" }}
          >
            <span style={{ color: "#FF5A2A" }}>—</span> ITACHI UCHIHA
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

      {/* ─── PHASE 4 — Editorial horizontal showcase ─── */}
      <div
        ref={pinRef}
        className="shinobi-horizontal-stage relative flex items-center overflow-hidden min-h-[100svh] border-y border-[#F5E6C8]/10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(245,230,200,0.035) 0 1px, transparent 1px 42px)",
        }}
      >
        <div
          ref={horizontalRef}
          className="shinobi-horizontal-track flex flex-row w-max items-center will-change-transform"
        >
          {SHOWCASE_ITEMS.map((item, index) => (
            <article
              key={item.number}
              className={`showcase-panel shinobi-horizontal-panel relative flex flex-col md:flex-row w-screen h-[80svh] md:h-[76svh] xl:h-[72svh] overflow-hidden ${
                index < SHOWCASE_ITEMS.length - 1
                  ? "border-b md:border-b-0 md:border-r border-[#F5E6C8]/10"
                  : ""
              }`}
              style={{ perspective: "1200px" }}
            >
              <div className="mx-auto w-full max-w-[1920px] px-4 md:px-10 lg:px-12 xl:px-[72px] flex flex-col md:flex-row md:items-center justify-between gap-10 md:gap-0 py-10 md:py-0 h-full">
                {/* Text column — title dominates the left */}
                <div className="showcase-content relative md:w-[55%] flex flex-col justify-center z-[1]">
                  <div
                    className="showcase-number pointer-events-none select-none absolute bottom-0 right-0 md:bottom-[-3%] font-anton leading-none text-[26vw] md:text-[16vw]"
                    style={{ color: "#8B1A1A", opacity: 0 }}
                    aria-hidden="true"
                  >
                    {item.number}
                  </div>
                  <h3
                    className="showcase-title relative font-anton uppercase leading-[0.95] tracking-[0.02em] text-[clamp(46px,11.5vw,84px)] md:text-[5vw]"
                    style={{ color: "#F5E6C8" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="showcase-desc relative font-inter text-sm md:text-lg mt-4 md:mt-6 max-w-md"
                    style={{ color: "rgba(245,230,200,0.60)" }}
                  >
                    {item.description}
                  </p>
                  <div
                    className="showcase-cta relative mt-7 md:mt-10 flex items-center gap-3"
                    style={{ color: "#FF5A2A" }}
                  >
                    <span className="font-anton text-sm tracking-[0.25em]">
                      EXPLORE
                    </span>
                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Visual column — artwork on the right */}
                <div
                  className={`relative flex items-center justify-center md:justify-end md:w-[45%] ${
                    item.number !== "02" ? "md:-mr-14" : ""
                  }`}
                >
                  <ShowcaseVisual item={item} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* ─── Closing transition — release into normal content ─── */}
      <div className="h-24 md:h-36" />
    </section>
  );
}