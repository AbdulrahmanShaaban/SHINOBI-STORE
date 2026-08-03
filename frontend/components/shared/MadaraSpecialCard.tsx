"use client";

import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useCartStore } from "./Cart";

gsap.registerPlugin(ScrollTrigger);

const SAND_COLORS: [number, number, number][] = [
  [212, 168, 67],
  [201, 162, 39],
  [230, 197, 111],
  [184, 149, 42],
  [170, 135, 38],
  [240, 210, 120],
  [195, 155, 50],
  [220, 180, 80],
];

const SAMPLE_W = 140;
const SAMPLE_H = 196;

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
  opacity: 0.35 + rand() * 0.55,
  radiusFactor: 0.7 + rand() * 0.6,
  speed: 10 + rand() * 16,
  phase: rand() * Math.PI * 2,
  spinFactor: 0.4 + rand() * 1.2,
}));

interface Particle {
  homeX: number;
  homeY: number;
  r: number;
  g: number;
  b: number;
  a: number;
  size: number;
  scatterX: number;
  scatterY: number;
  angle: number;
}

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
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const defaultImgRef = useRef<HTMLImageElement>(null);
  const jutsuImgRef = useRef<HTMLImageElement>(null);
  const sandOrbitRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  const particlesRef = useRef<Particle[]>([]);
  const progressRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d")!;
    let rafId = 0;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    context.scale(dpr, dpr);

    const canvasW = rect.width;
    const canvasH = rect.height;

    const scaleX = canvasW / SAMPLE_W;
    const scaleY = canvasH / SAMPLE_H;
    const scale = Math.min(scaleX, scaleY);

    const particles: Particle[] = [];
    const step = 2;

    for (let y = 0; y < SAMPLE_H; y += step) {
      for (let x = 0; x < SAMPLE_W; x += step) {
        const sandColor =
          SAND_COLORS[Math.floor(Math.random() * SAND_COLORS.length)];
        const variation = Math.floor(Math.random() * 30) - 15;
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 280;
        particles.push({
          homeX: x + (Math.random() - 0.5) * 0.5,
          homeY: y + (Math.random() - 0.5) * 0.5,
          r: Math.min(255, Math.max(0, sandColor[0] + variation)),
          g: Math.min(255, Math.max(0, sandColor[1] + variation)),
          b: Math.min(255, Math.max(0, sandColor[2] + variation)),
          a: 255,
          size: 2.8 + Math.random() * 0.9,
          scatterX: Math.cos(angle) * dist,
          scatterY: Math.sin(angle) * dist * 0.7 + 40,
          angle,
        });
      }
    }

    particlesRef.current = particles;

    function render() {
      const progress = progressRef.current;
      const t = Math.min(1, Math.max(0, progress));
      const ease = 1 - Math.pow(1 - t, 3);
      const cover = 1 - ease;

      context.clearRect(0, 0, canvasW, canvasH);

      if (cover > 0.01) {
        const bg = context.createLinearGradient(0, 0, 0, canvasH);
        bg.addColorStop(0, "#c9a227");
        bg.addColorStop(0.5, "#d9b14a");
        bg.addColorStop(1, "#a3802a");
        context.globalAlpha = cover;
        context.fillStyle = bg;
        context.fillRect(0, 0, canvasW, canvasH);
        context.globalAlpha = 1;
      }

      const time = Date.now() * 0.001;
      const particles = particlesRef.current;

      for (const p of particles) {
        let x = p.homeX + p.scatterX * ease;
        let y = p.homeY + p.scatterY * ease;

        if (t < 0.05) {
          x += Math.sin(time * 0.8 + p.angle * 3) * 1.5;
          y += Math.cos(time * 0.6 + p.angle * 2) * 1;
        }

        const alpha = (p.a / 255) * cover;
        if (alpha <= 0.01) continue;

        const drawX = x * scaleX;
        const drawY = y * scaleY;
        const drawSize = p.size * scale;

        context.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
        context.fillRect(drawX, drawY, drawSize, drawSize);
      }

      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  useGSAP(
    () => {
      if (!sectionRef.current || !titleRef.current || !cardRef.current) return;

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

      gsap.fromTo(
        cardRef.current,
        { y: 80, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: cardRef.current,
            start: "top 85%",
            once: true,
          },
        }
      );

      if (canvasRef.current) {
        ScrollTrigger.create({
          trigger: canvasRef.current,
          start: "top 55%",
          end: "top 10%",
          scrub: true,
          onUpdate: (self) => {
            progressRef.current = self.progress;
          },
        });
      }

      if (sandOrbitRef.current && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const maxRadius = Math.min(centerX, centerY) + 60;

        const sandImgs = Array.from(
          sandOrbitRef.current.querySelectorAll<HTMLImageElement>("img")
        );

        sandImgs.forEach((img, i) => {
          const config = ORBIT_CONFIGS[i % ORBIT_CONFIGS.length];
          const radius = 40 + config.radiusFactor * maxRadius;
          const state = { angle: config.phase };

          gsap.set(img, {
            x: centerX + radius * Math.cos(config.phase),
            y: centerY + radius * Math.sin(config.phase),
            rotation: config.phase * (180 / Math.PI),
          });

          gsap.to(state, {
            angle: config.phase + Math.PI * 2,
            duration: config.speed,
            repeat: -1,
            ease: "none",
            onUpdate: () => {
              gsap.set(img, {
                x: centerX + radius * Math.cos(state.angle),
                y: centerY + radius * Math.sin(state.angle),
                rotation: state.angle * config.spinFactor * (180 / Math.PI),
              });
            },
          });
        });
      }
    },
    { scope: sectionRef }
  );

  const handleMouseEnter = () => {
    gsap.to(defaultImgRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.to(jutsuImgRef.current, {
      opacity: 1,
      scale: 1.04,
      duration: 0.4,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    gsap.to(defaultImgRef.current, {
      opacity: 1,
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.to(jutsuImgRef.current, {
      opacity: 0,
      scale: 1,
      duration: 0.4,
      ease: "power2.out",
    });
  };

  return (
    <section
      ref={sectionRef}
      className="w-full py-12 md:py-16 min-h-[80vh] md:min-h-[90vh] mb-16 md:mb-20 flex flex-col items-center"
    >
      <div className="w-full max-w-[1900px] px-4 md:px-6 lg:px-8">
        {/* SPECIAL CARD heading */}
        <div ref={titleRef} className="flex justify-center mb-10 md:mb-14">
          <div
            className="font-anton uppercase text-[28px] md:text-[36px] lg:text-[42px] leading-none tracking-wide"
            style={{ color: "#F5E6C8" }}
          >
            SPECIAL CARD
          </div>
        </div>

        {/* Madara card — identical structure to existing 3 cards, larger */}
        <div ref={cardRef} className="relative flex justify-center">
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
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ imageRendering: "auto" }}
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

          {/* Orbiting sand ring around the card */}
          <div
            ref={sandOrbitRef}
            className="pointer-events-none absolute inset-0 overflow-visible"
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
