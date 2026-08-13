"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useCartStore } from "./Cart";

gsap.registerPlugin(ScrollTrigger);

const SAND_ORBIT_COUNT = 24;

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20240804);

const ORBIT_CONFIGS = Array.from({ length: SAND_ORBIT_COUNT }, () => ({
  size: 22 + rand() * 50,
  opacity: 0.3 + rand() * 0.5,
  radiusFactor: 0.78 + rand() * 0.58,
  speed: 9 + rand() * 15,
  phase: rand() * Math.PI * 2,
  spinFactor: 0.45 + rand() * 1.1,
  yScale: 0.62 + rand() * 0.32,
}));

const DUST_PARTICLES = Array.from({ length: 56 }, (_, i) => {
  const angle = (i / 56) * Math.PI * 2 + (i % 5) * 0.11;
  const distance = 0.45 + ((i * 37) % 100) / 100;
  return {
    angle,
    distance,
    size: 4 + ((i * 17) % 12),
    delay: (i % 8) * 0.012,
    y: -0.12 + ((i * 13) % 100) / 100 * 0.24,
    rotate: -30 + ((i * 29) % 60),
  };
});

interface MadaraSpecialCardProps {
  defaultImg?: string;
  jutsuImg?: string;
  sandImg?: string;
}

export default function MadaraSpecialCard({
  defaultImg = "/madara-default.png",
  jutsuImg = "/madara-susanoo.png",
  sandImg = "/sand.png",
}: MadaraSpecialCardProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const coffinRef = useRef<HTMLDivElement>(null);
  const coffinBodyRef = useRef<HTMLDivElement>(null);
  const coffinDoorRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLDivElement>(null);
  const dustFrontRef = useRef<HTMLDivElement>(null);
  const craterRef = useRef<HTMLDivElement>(null);
  const defaultImgRef = useRef<HTMLImageElement>(null);
  const jutsuImgRef = useRef<HTMLImageElement>(null);
  const sandOrbitRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const stage = stageRef.current;
      const card = cardRef.current;
      const coffin = coffinRef.current;
      const coffinBody = coffinBodyRef.current;
      const coffinDoor = coffinDoorRef.current;
      const ground = groundRef.current;
      const dust = dustRef.current;
      const dustFront = dustFrontRef.current;
      const crater = craterRef.current;

      if (!section || !stage || !card || !coffin || !coffinBody || !coffinDoor) {
        return;
      }

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      gsap.fromTo(
        titleRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 85%",
            once: true,
          },
        }
      );

      if (reducedMotion) {
        gsap.set(card, { opacity: 1, y: 0 });
        gsap.set(coffin, { opacity: 0, pointerEvents: "none" });
        gsap.set(sandOrbitRef.current, { opacity: 1 });
      } else {
        gsap.set(card, { opacity: 1, y: 0, pointerEvents: "none" });
        gsap.set(coffin, { yPercent: 108, opacity: 1, scale: 0.97 });
        gsap.set(coffinBody, { y: 0, rotation: 0 });
        gsap.set(coffinDoor, { rotationX: 0, y: 0, transformOrigin: "50% 100%" });
        gsap.set([dust, dustFront], { opacity: 0, scale: 0.25 });
        gsap.set(crater, { opacity: 0, scale: 0.2 });
        gsap.set(ground, { scaleY: 1, opacity: 1 });
        gsap.set(sandOrbitRef.current, { opacity: 0 });

        const reveal = gsap.timeline({
          defaults: { overwrite: "auto" },
          scrollTrigger: {
            trigger: stage,
            // The special animation starts only when the Madara stage reaches
            // the visual focus area. The previous 3 character cards can scroll
            // normally before this point.
            start: "top 18%",
            // Give the user a generous amount of scroll to play the resurrection.
            end: () => `+=${window.innerWidth < 768 ? 1700 : 2500}`,
            scrub: 0.65,
            pin: stage,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: -1,
          },
        });

        reveal
          .addLabel("buried")
          .to(ground, { scaleY: 0.985, duration: 0.20, ease: "power2.inOut" }, "buried+=0.02")
          .to(crater, { opacity: 0.9, scale: 0.72, duration: 0.20, ease: "power2.out" }, "buried+=0.04")
          .to(dust, { opacity: 0.8, scale: 0.55, duration: 0.20, ease: "power2.out" }, "buried+=0.05")
          .addLabel("disturbance")
          .to(coffin, { yPercent: 88, duration: 0.28, ease: "power2.in" }, "disturbance")
          .to(dust, { scale: 0.9, opacity: 1, duration: 0.24, ease: "power2.out" }, "disturbance+=0.02")
          .to(crater, { scale: 1.15, opacity: 1, duration: 0.38, ease: "power3.out" }, "disturbance")
          .addLabel("emerge")
          .to(coffin, { yPercent: -4, scale: 1.01, duration: 0.48, ease: "power4.out" }, "emerge")
          .to(dust, { scale: 1.35, opacity: 0.9, duration: 0.36, ease: "power3.out" }, "emerge+=0.05")
          .to(crater, { scale: 1.55, opacity: 0.72, duration: 0.42, ease: "power3.out" }, "emerge+=0.03")
          .addLabel("impact")
          .to(coffin, { yPercent: 1, scale: 1, duration: 0.18, ease: "back.out(2.8)" }, "impact")
          .to(coffinBody, {
            keyframes: [
              { x: -7, rotation: -0.9, duration: 0.025 },
              { x: 8, rotation: 1, duration: 0.025 },
              { x: -6, rotation: -0.75, duration: 0.025 },
              { x: 5, rotation: 0.55, duration: 0.025 },
              { x: -3, rotation: -0.3, duration: 0.025 },
              { x: 0, rotation: 0, duration: 0.04 },
            ],
            duration: 0.28,
            ease: "none",
          }, "impact+=0.02")
          .to(dustFront, { opacity: 1, scale: 0.7, duration: 0.08, ease: "power2.out" }, "impact")
          .to(dustFront, { opacity: 0.05, scale: 1.55, duration: 0.28, ease: "power3.out" }, "impact+=0.03")
          .to(dust, { opacity: 0.35, scale: 1.75, duration: 0.42, ease: "power3.out" }, "impact+=0.05")
          .to(crater, { opacity: 0.25, scale: 1.8, duration: 0.34, ease: "power3.out" }, "impact+=0.05")
          .addLabel("open")
          .to(coffinDoor, {
            rotationX: -105,
            y: 18,
            duration: 0.42,
            ease: "power3.inOut",
          }, "open")
          .to(dustFront, { opacity: 0.2, scale: 1.9, duration: 0.28, ease: "power2.out" }, "open+=0.02")
          .addLabel("reveal")
          .fromTo(
            card,
            { clipPath: "inset(100% 0% 0% 0%)", filter: "brightness(0.55)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              filter: "brightness(1)",
              duration: 0.36,
              ease: "power3.out",
            },
            "reveal+=0.05"
          )
          .to(dust, { opacity: 0, scale: 2.2, duration: 0.22, ease: "power2.out" }, "reveal+=0.08")
          .to(crater, { opacity: 0, scale: 2.1, duration: 0.25, ease: "power2.out" }, "reveal+=0.08")
          .to(dustFront, { opacity: 0, scale: 2.15, duration: 0.22, ease: "power2.out" }, "reveal+=0.08")
          // Keep the coffin frame around the revealed card. Only the front door moves away,
          // so the final composition still reads as Madara standing inside the coffin.
          .set(card, { pointerEvents: "auto" }, "reveal+=0.30")
          .to(sandOrbitRef.current, { opacity: 1, duration: 0.18, ease: "power2.out" }, "reveal+=0.18");
      }

      if (sandOrbitRef.current) {
        const sandImgs = Array.from(
          sandOrbitRef.current.querySelectorAll<HTMLImageElement>("img")
        );
        const orbitStates: { angle: number }[] = [];

        const updateOrbit = () => {
          const rect = card.getBoundingClientRect();
          const orbitRect = sandOrbitRef.current!.getBoundingClientRect();
          const centerX = rect.left - orbitRect.left + rect.width / 2;
          const centerY = rect.top - orbitRect.top + rect.height / 2;
          const maxRadius = Math.min(rect.width, rect.height) * 0.5;

          sandImgs.forEach((img, i) => {
            const config = ORBIT_CONFIGS[i % ORBIT_CONFIGS.length];
            const radiusX = maxRadius * (0.7 + config.radiusFactor * 0.55);
            const radiusY = maxRadius * config.yScale * (0.72 + config.radiusFactor * 0.28);
            const state = { angle: config.phase };
            orbitStates.push(state);

            gsap.set(img, {
              x: centerX + Math.cos(state.angle) * radiusX,
              y: centerY + Math.sin(state.angle) * radiusY,
              rotation: state.angle * config.spinFactor * (180 / Math.PI),
            });

            if (!reducedMotion) {
              gsap.to(state, {
                angle: config.phase + Math.PI * 2,
                duration: config.speed,
                repeat: -1,
                ease: "none",
                onUpdate: () => {
                  const latestRect = card.getBoundingClientRect();
                  const latestOrbitRect = sandOrbitRef.current!.getBoundingClientRect();
                  const cx = latestRect.left - latestOrbitRect.left + latestRect.width / 2;
                  const cy = latestRect.top - latestOrbitRect.top + latestRect.height / 2;
                  const rx = Math.min(latestRect.width, latestRect.height) * 0.5 * (0.7 + config.radiusFactor * 0.55);
                  const ry = Math.min(latestRect.width, latestRect.height) * 0.5 * config.yScale * (0.72 + config.radiusFactor * 0.28);

                  gsap.set(img, {
                    x: cx + Math.cos(state.angle) * rx,
                    y: cy + Math.sin(state.angle) * ry,
                    rotation: state.angle * config.spinFactor * (180 / Math.PI),
                  });
                },
              });
            }
          });
        };

        updateOrbit();
        const resizeObserver = new ResizeObserver(updateOrbit);
        resizeObserver.observe(card);
        window.addEventListener("resize", updateOrbit);

        return () => {
          resizeObserver.disconnect();
          window.removeEventListener("resize", updateOrbit);
          gsap.killTweensOf(orbitStates);
        };
      }
    },
    { scope: sectionRef, dependencies: [defaultImg, jutsuImg, sandImg] }
  );

  const handleMouseEnter = () => {
    gsap.to(defaultImgRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.out",
      overwrite: "auto",
    });
    gsap.to(jutsuImgRef.current, {
      opacity: 1,
      scale: 1.04,
      duration: 0.4,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const handleMouseLeave = () => {
    gsap.to(defaultImgRef.current, {
      opacity: 1,
      duration: 0.4,
      ease: "power2.out",
      overwrite: "auto",
    });
    gsap.to(jutsuImgRef.current, {
      opacity: 0,
      scale: 1,
      duration: 0.4,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  return (
    <section
      ref={sectionRef}
      className="w-full py-12 md:py-16 min-h-[80vh] md:min-h-[90vh] mb-16 md:mb-20 flex flex-col items-center"
    >
      <div className="w-full max-w-[1900px] px-4 md:px-6 lg:px-8">
        <div ref={titleRef} className="flex justify-center mb-10 md:mb-14">
          <div
            className="font-anton uppercase text-[28px] md:text-[36px] lg:text-[42px] leading-none tracking-wide"
            style={{ color: "#F5E6C8" }}
          >
            SPECIAL CARD
          </div>
        </div>

        <div ref={stageRef} className="relative flex justify-center isolate">
          {/* Ground plane: the coffin visually breaks through this layer. */}
          <div
            ref={groundRef}
            className="pointer-events-none absolute bottom-[8%] left-1/2 z-[20] h-[10px] w-[min(760px,96%)] -translate-x-1/2 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(93,62,28,.7) 12%, rgba(164,119,58,.95) 35%, rgba(110,72,32,.85) 50%, rgba(164,119,58,.95) 65%, rgba(93,62,28,.7) 88%, transparent)",
              filter: "blur(2px)",
              transformOrigin: "center",
            }}
          />

          {/* Ground crater and temporary Edo Tensei dust. */}
          <div
            ref={craterRef}
            className="pointer-events-none absolute bottom-[3%] left-1/2 z-[18] h-[120px] w-[min(700px,92%)] -translate-x-1/2 rounded-[50%]"
            style={{
              background:
                "radial-gradient(ellipse, rgba(63,38,18,.72) 0%, rgba(115,76,31,.52) 28%, rgba(174,127,55,.28) 48%, transparent 72%)",
              filter: "blur(5px)",
              opacity: 0,
            }}
          />

          <div
            ref={dustRef}
            className="pointer-events-none absolute bottom-[-2%] left-1/2 z-[55] h-[210px] w-[min(900px,115%)] -translate-x-1/2 overflow-visible"
            style={{ opacity: 0, transformOrigin: "50% 88%" }}
            aria-hidden="true"
          >
            {DUST_PARTICLES.map((particle, i) => (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: "50%",
                  top: "86%",
                  width: `${particle.size}px`,
                  height: `${particle.size * (0.55 + particle.distance * 0.45)}px`,
                  opacity: 0.3 + particle.distance * 0.55,
                  background:
                    i % 3 === 0
                      ? "#6f4926"
                      : i % 3 === 1
                        ? "#a9793e"
                        : "#d2ae6b",
                  filter: i % 4 === 0 ? "blur(2px)" : "blur(.4px)",
                  transform: `translate(-50%, -50%) rotate(${particle.rotate}deg)`,
                }}
              />
            ))}
          </div>

          <div
            ref={dustFrontRef}
            className="pointer-events-none absolute bottom-[-1%] left-1/2 z-[80] h-[190px] w-[min(900px,115%)] -translate-x-1/2"
            style={{ opacity: 0, transformOrigin: "50% 50%" }}
            aria-hidden="true"
          >
            <div
              className="absolute inset-x-[8%] bottom-0 h-[95px] rounded-[50%]"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(210,174,107,.82) 0%, rgba(157,111,54,.5) 34%, rgba(92,59,27,.18) 55%, transparent 74%)",
                filter: "blur(7px)",
              }}
            />
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${8 + ((i * 47) % 84)}%`,
                  top: `${35 + ((i * 31) % 48)}%`,
                  width: `${8 + ((i * 13) % 18)}px`,
                  height: `${5 + ((i * 11) % 11)}px`,
                  background: i % 2 ? "#a9793e" : "#d2ae6b",
                  opacity: 0.55 + (i % 4) * 0.1,
                  filter: "blur(1px)",
                }}
              />
            ))}
          </div>

          <div
            ref={cardRef}
            className="relative z-[35] flex justify-center w-full"
            style={{ clipPath: "inset(0% 0% 0% 0%)" }}
          >
            <div
              className="flex flex-col rounded-xl overflow-hidden w-full max-w-[700px]"
              style={{ backgroundColor: "#1a0808", border: "2px solid #8b1a1a" }}
            >
              <div className="flex flex-col items-center w-full flex-1 p-6 md:p-8 lg:p-10 pb-0">
                <div
                  className="font-anton uppercase text-[32px] md:text-[40px] lg:text-[48px] leading-none"
                  style={{ color: "#F5E6C8" }}
                >
                  MADARA
                </div>
                <div
                  className="font-inter text-sm md:text-base mt-1 text-center"
                  style={{ color: "rgba(245,230,200,0.85)" }}
                >
                  The world will know true peace.
                </div>
                <div
                  className="relative w-full flex-1 min-h-[500px] md:min-h-[620px] lg:min-h-[720px] overflow-hidden rounded-lg flex items-center justify-center mt-4"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <img
                    ref={defaultImgRef}
                    src={defaultImg}
                    alt="Madara Uchiha"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  <img
                    ref={jutsuImgRef}
                    src={jutsuImg}
                    alt="Madara Susanoo"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ opacity: 0 }}
                  />
                </div>
              </div>
              <div className="w-full p-6 md:p-8 lg:p-10 pt-4 md:pt-5 pb-12 lg:pb-14 mt-auto">
                <div className="flex gap-3 md:gap-4 mx-4 md:mx-6 lg:mx-8">
                  <button
                    onClick={() =>
                      addItem({
                        id: "madara",
                        name: "MADARA",
                        price: 49.99,
                        quantity: 1,
                        image: defaultImg,
                      })
                    }
                    className="flex-1 h-[64px] md:h-[68px] lg:h-[72px] px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                    style={{ backgroundColor: "#F4E9D3", color: "#1A1A1A" }}
                  >
                    <span>ADD TO CART</span>
                    <span className="font-inter text-[13px] md:text-[14px] font-semibold">
                      $49.99
                    </span>
                  </button>
                  <Link
                    href="/product/madara"
                    className="flex-1 h-[64px] md:h-[68px] lg:h-[72px] px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                    style={{
                      backgroundColor: "transparent",
                      color: "white",
                      border: "1.5px solid white",
                    }}
                  >
                    <span>VIEW PRODUCT</span>
                    <svg
                      className="w-6 h-6 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Edo Tensei coffin. It starts below the ground and rises over the card. */}
          <div
            ref={coffinRef}
            className="pointer-events-none absolute left-1/2 top-0 z-[65] h-full w-[calc(100%+28px)] max-w-[728px] -translate-x-1/2"
            style={{ transformOrigin: "50% 100%" }}
            aria-hidden="true"
          >
            <div ref={coffinBodyRef} className="relative h-full w-full" style={{ perspective: "1400px" }}>
              {/* Coffin frame: the center is intentionally transparent so the card is physically inside the coffin. */}
              <div
                className="absolute inset-0 rounded-[14px]"
                style={{
                  border: "8px solid #2d1b11",
                  boxShadow:
                    "inset 0 0 0 3px rgba(226,183,112,.22), 0 28px 50px rgba(0,0,0,.5)",
                }}
              />
              <div
                className="absolute inset-x-0 top-0 h-[12%] rounded-t-[12px]"
                style={{
                  background:
                    "linear-gradient(90deg, #3b2519, #8d6035 12%, #a77743 30%, #5f3b20 48%, #9b6d3c 70%, #49301b 88%, #2d1b11), repeating-linear-gradient(90deg, rgba(35,20,12,.25) 0 3px, transparent 3px 30px)",
                  boxShadow: "inset 0 -8px 18px rgba(0,0,0,.28)",
                }}
              />
              <div
                className="absolute inset-y-0 left-0 w-[8%] rounded-l-[12px]"
                style={{
                  background: "linear-gradient(90deg, #2d1b11, #714a2a 45%, #9b6d3c 72%, #3b2519)",
                }}
              />
              <div
                className="absolute inset-y-0 right-0 w-[8%] rounded-r-[12px]"
                style={{
                  background: "linear-gradient(90deg, #3b2519, #9b6d3c 28%, #714a2a 55%, #2d1b11)",
                }}
              />
              <div
                className="absolute inset-x-0 bottom-0 h-[9%] rounded-b-[12px]"
                style={{
                  background: "linear-gradient(90deg, #2d1b11, #714a2a 20%, #9b6d3c 48%, #5a381e 72%, #2d1b11)",
                  boxShadow: "inset 0 8px 18px rgba(0,0,0,.32)",
                }}
              />

              {/* Edo Tensei seal */}
              <div
                className="absolute left-1/2 top-[3%] z-[3] flex h-[58px] w-[58px] -translate-x-1/2 items-center justify-center rounded-sm"
                style={{
                  background: "#c9aa7b",
                  border: "2px solid #3a2416",
                  boxShadow: "0 2px 7px rgba(0,0,0,.35)",
                }}
              >
                <span
                  className="font-serif text-[30px] leading-none"
                  style={{ color: "#17100b" }}
                >
                  初
                </span>
              </div>

              {/* Door: physically opens downward. */}
              <div
                ref={coffinDoorRef}
                className="absolute inset-[8%] z-[6] rounded-[8px]"
                style={{
                  transformOrigin: "50% 100%",
                  transformStyle: "preserve-3d",
                  background:
                    "linear-gradient(90deg, #382318, #81552e 9%, #a97943 20%, #5e3a20 33%, #9b6e3e 48%, #633f21 62%, #a1723e 78%, #54331c 91%, #322015), repeating-linear-gradient(90deg, rgba(35,20,12,.35) 0 3px, transparent 3px 31px)",
                  border: "5px solid #2b1a10",
                  boxShadow:
                    "inset 0 0 35px rgba(0,0,0,.42), 0 8px 18px rgba(0,0,0,.42)",
                  backfaceVisibility: "hidden",
                }}
              >
                <div
                  className="absolute inset-[12px] rounded-[4px]"
                  style={{
                    border: "2px solid rgba(33,20,12,.55)",
                    background:
                      "repeating-linear-gradient(90deg, transparent 0 23px, rgba(42,24,13,.32) 24px 26px, transparent 27px 56px)",
                  }}
                />
                <div
                  className="absolute left-1/2 top-1/2 h-[74%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[3px]"
                  style={{
                    border: "1px solid rgba(24,14,9,.38)",
                    boxShadow: "inset 0 0 35px rgba(0,0,0,.25)",
                  }}
                />
              </div>

              {/* Heavy lower hinge / threshold */}
              <div
                className="absolute bottom-0 left-[2%] right-[2%] z-[7] h-[22px] rounded-b-[10px]"
                style={{
                  background: "linear-gradient(#6d4828, #2d1b11)",
                  borderTop: "2px solid rgba(224,181,111,.25)",
                }}
              />
            </div>
          </div>

          {/* Persistent sand.png orbit. This is intentionally outside the card content. */}
          <div
            ref={sandOrbitRef}
            className="pointer-events-none absolute -inset-[12%] z-[95] overflow-visible"
            aria-hidden="true"
          >
            {ORBIT_CONFIGS.map((config, i) => (
              <img
                key={i}
                src={sandImg}
                alt=""
                className="absolute left-0 top-0 object-contain"
                style={{
                  width: `${config.size}px`,
                  height: `${config.size}px`,
                  opacity: config.opacity,
                  willChange: "transform",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}