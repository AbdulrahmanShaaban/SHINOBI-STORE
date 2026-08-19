"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useCartStore } from "@/components/shared/Cart";

gsap.registerPlugin(ScrollTrigger);

const MOBILE_SAND_COUNT = 16;
const MOBILE_DUST_COUNT = 20;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

const SAND_ORBIT_COUNT = 42;

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
  // Larger, softer fragments read more like drifting sand/dust than tiny sprites.
  size: 18 + rand() * 58,
  opacity: 0.08 + rand() * 0.38,
  radiusFactor: 0.95 + rand() * 0.72,
  speed: 5.5 + rand() * 8.5,
  phase: rand() * Math.PI * 2,
  spinFactor: 0.25 + rand() * 0.85,
  yScale: 0.54 + rand() * 0.5,
  drift: 0.8 + rand() * 1.65,
  depth: 0.35 + rand() * 1.15,
  stretchX: 0.72 + rand() * 1.45,
  stretchY: 0.38 + rand() * 0.82,
  blur: 0.15 + rand() * 2.1,
  gust: 0.8 + rand() * 1.5,
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
  sixPathsImg?: string;
  sandImg?: string;
}

export default function MadaraSpecialCard({
  defaultImg = "/madara-default.png",
  jutsuImg = "/madara-six-paths.png",
  sixPathsImg = "/madara-six-paths.png",
  sandImg = "/sand.png",
}: MadaraSpecialCardProps) {
  const isMobile = useIsMobile();
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
  const sixPathsImgRef = useRef<HTMLImageElement>(null);
  const chakraAuraRef = useRef<HTMLDivElement>(null);
  const chakraCoreRef = useRef<HTMLDivElement>(null);
  const chakraRingRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
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
      const chakraAura = chakraAuraRef.current;
      const chakraCore = chakraCoreRef.current;
      const chakraRings = chakraRingRefs.map((ref) => ref.current);

      if (!section || !stage || !card || !coffin || !coffinBody || !coffinDoor || !chakraAura || !chakraCore || chakraRings.some((el) => !el)) {
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
        gsap.set(chakraAura, { opacity: 0, scale: 0.88 });
        gsap.set(chakraCore, { opacity: 0, scale: 0.76 });
        gsap.set(chakraRings, { opacity: 0 });
        gsap.set(chakraRings[0], { rotation: 0, scale: 0.96 });
        gsap.set(chakraRings[1], { rotation: 120, scale: 1.02 });
        gsap.set(chakraRings[2], { rotation: 240, scale: 1.08 });

        // Seamless Six Paths chakra motion.
        // Each flame layer returns to its exact starting transform before its loop
        // repeats, so there is no visible snap/cut when the animation cycles.
        const flameConfigs = [
          {
            duration: 5.2,
            delay: 0,
            driftX: 3.5,
            driftY: -3,
            rotationA: 7,
            rotationB: -5,
            scaleXA: 1.08,
            scaleYA: 0.94,
            scaleXB: 0.95,
            scaleYB: 1.06,
          },
          {
            duration: 6.4,
            delay: 0.75,
            driftX: -3.8,
            driftY: 2.8,
            rotationA: -8,
            rotationB: 5,
            scaleXA: 0.94,
            scaleYA: 1.07,
            scaleXB: 1.06,
            scaleYB: 0.94,
          },
          {
            duration: 7.2,
            delay: 1.35,
            driftX: 3,
            driftY: 2.2,
            rotationA: 6,
            rotationB: -7,
            scaleXA: 1.06,
            scaleYA: 0.95,
            scaleXB: 0.94,
            scaleYB: 1.07,
          },
        ];

        chakraRings.forEach((ring, index) => {
          const baseRotation = [0, 120, 240][index];
          const config = flameConfigs[index];
          const cycle = gsap.timeline({
            repeat: -1,
            delay: config.delay,
            defaults: { ease: "sine.inOut" },
          });

          cycle
            .to(ring, {
              xPercent: config.driftX,
              yPercent: config.driftY,
              rotation: baseRotation + config.rotationA,
              scaleX: config.scaleXA,
              scaleY: config.scaleYA,
              duration: config.duration * 0.28,
            })
            .to(ring, {
              xPercent: config.driftX * -0.7,
              yPercent: config.driftY * -0.5,
              rotation: baseRotation + config.rotationB,
              scaleX: config.scaleXB,
              scaleY: config.scaleYB,
              duration: config.duration * 0.32,
            })
            .to(ring, {
              xPercent: config.driftX * 0.35,
              yPercent: config.driftY * 0.8,
              rotation: baseRotation + config.rotationA * 0.35,
              scaleX: 1.025,
              scaleY: 0.985,
              duration: config.duration * 0.16,
            })
            .to(ring, {
              xPercent: 0,
              yPercent: 0,
              rotation: baseRotation,
              scaleX: 1,
              scaleY: 1,
              duration: config.duration * 0.24,
            });
        });

        // The broad aura breathes on a long, non-synchronized cycle so it feels
        // like continuous energy rather than a repeating CSS animation.
        const auraDrift = gsap.timeline({ repeat: -1, defaults: { ease: "sine.inOut" } });
        auraDrift
          .to(chakraAura, { yPercent: -1.6, xPercent: 0.8, scale: 1.018, duration: 2.8 })
          .to(chakraAura, { yPercent: 0.9, xPercent: -0.7, scale: 0.992, duration: 3.2 })
          .to(chakraAura, { yPercent: 0, xPercent: 0, scale: 1, duration: 2.2 });

        const chakraPulse = gsap.to(chakraAura, {
          opacity: 0.88,
          scale: 1.025,
          duration: 2.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          paused: true,
        });

        const chakraCorePulse = gsap.to(chakraCore, {
          opacity: 0.82,
          scale: 1.09,
          duration: 1.55,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          paused: true,
        });

        // Keep everything alive continuously; visibility is still controlled by
        // the reveal timeline, so hidden states do not require restarting loops.
        chakraPulse.pause();
        chakraCorePulse.pause();
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
          // Per-particle burst: each dust speck kicks outward from its initial
          // angle by a small offset, so the disturbance reads as scattered
          // debris rather than a single scaling blob.
          .call(() => {
            const particles = dust?.querySelectorAll<HTMLSpanElement>("span");
            if (!particles) return;
            particles.forEach((el, i) => {
              const p = DUST_PARTICLES[i];
              const burstX = Math.cos(p.angle) * p.distance * 32;
              const burstY = Math.sin(p.angle) * p.distance * 14 + p.y * 22;
              gsap.to(el, {
                x: burstX,
                y: burstY,
                rotation: `+=${p.rotate * 0.4}`,
                duration: 0.26,
                delay: p.delay,
                ease: "power3.out",
              });
            });
          }, [], "disturbance+=0.02")
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
            rotationX: -112,
            y: 70,
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
          .to(sandOrbitRef.current, { opacity: 1, duration: 0.22, ease: "power2.out" }, "reveal+=0.18")
          .to(chakraAura, { opacity: 1, scale: 1, duration: 0.38, ease: "power3.out" }, "reveal+=0.20")
          .to(chakraCore, { opacity: 0.85, scale: 1, duration: 0.34, ease: "power3.out" }, "reveal+=0.24")
          .to(chakraRings, { opacity: 1, scale: 1, duration: 0.42, stagger: 0.055, ease: "power3.out" }, "reveal+=0.24")
          .to(chakraCore, { opacity: 0.58, scale: 1.06, duration: 0.22, repeat: 3, yoyo: true, ease: "sine.inOut" }, "reveal+=0.55")
          .call(() => {
            chakraPulse.play();
            chakraCorePulse.play();
          }, [], "reveal+=0.60");
      }

      if (sandOrbitRef.current) {
        const orbit = sandOrbitRef.current;
        const sandImgs = Array.from(orbit.querySelectorAll<HTMLImageElement>("img"));

        // Keep the orbit on a single GSAP ticker instead of running one tween
        // and multiple layout reads per particle. Geometry is cached and only
        // recalculated when the card changes size.
        const setX = sandImgs.map((img) => gsap.quickSetter(img, "x", "px"));
        const setY = sandImgs.map((img) => gsap.quickSetter(img, "y", "px"));
        const setRotation = sandImgs.map((img) => gsap.quickSetter(img, "rotation", "deg"));
        const setScaleX = sandImgs.map((img) => gsap.quickSetter(img, "scaleX"));
        const setScaleY = sandImgs.map((img) => gsap.quickSetter(img, "scaleY"));
        const setOpacity = sandImgs.map((img) => gsap.quickSetter(img, "opacity"));

        const geometry = {
          centerX: 0,
          centerY: 0,
          baseRadius: 0,
        };

        const updateOrbitGeometry = () => {
          const cardRect = card.getBoundingClientRect();
          const orbitRect = orbit.getBoundingClientRect();
          const base = Math.min(cardRect.width, cardRect.height) * 0.5;

          geometry.centerX = cardRect.left - orbitRect.left + cardRect.width * 0.5;
          geometry.centerY = cardRect.top - orbitRect.top + cardRect.height * 0.5;
          geometry.baseRadius = base;
        };

        updateOrbitGeometry();

        if (reducedMotion) {
          sandImgs.forEach((img, i) => {
            const config = ORBIT_CONFIGS[i];
            const angle = config.phase;
            const rx = geometry.baseRadius * (0.82 + config.radiusFactor * 0.58);
            const ry = geometry.baseRadius * config.yScale * (0.82 + config.radiusFactor * 0.26);
            const tangentRotation = Math.atan2(Math.cos(angle) * ry, -Math.sin(angle) * rx) * (180 / Math.PI);

            setX[i](geometry.centerX + Math.cos(angle) * rx);
            setY[i](geometry.centerY + Math.sin(angle) * ry);
            setRotation[i](tangentRotation * config.spinFactor);
            setScaleX[i](config.stretchX * 0.9);
            setScaleY[i](config.stretchY * 0.9);
            setOpacity[i](Math.max(0.06, config.opacity * (0.72 + config.depth * 0.2)));
          });
        } else {
          const orbitProgress = { value: 0 };

          const orbitTween = gsap.to(orbitProgress, {
            value: Math.PI * 2,
            duration: 12,
            repeat: -1,
            ease: "none",
            onUpdate: () => {
              const rotation = orbitProgress.value;

              sandImgs.forEach((_, i) => {
                const config = ORBIT_CONFIGS[i];

                // Slightly chaotic, wind-driven orbit: the path remains centered on
                // the coffin, but the radius and vertical flow breathe continuously.
                const angle = config.phase + rotation * config.speed / 12;
                const turbulence =
                  Math.sin(angle * 1.35 + config.phase * 0.8) * 0.055 +
                  Math.sin(angle * 2.7 + config.phase * 1.7) * 0.025;
                const radialBreath = 1 + turbulence;
                const rx = geometry.baseRadius * (0.98 + config.radiusFactor * 0.58) * radialBreath;
                const ry =
                  geometry.baseRadius *
                  config.yScale *
                  (0.96 + config.radiusFactor * 0.32) *
                  (1 + Math.cos(angle * 1.1 + config.phase) * 0.045);

                const gustX =
                  Math.sin(angle * 1.9 + config.phase) *
                  geometry.baseRadius *
                  0.055 *
                  config.drift;
                const gustY =
                  Math.cos(angle * 1.45 + config.phase * 0.7) *
                  geometry.baseRadius *
                  0.035 *
                  config.gust;

                const windBias =
                  Math.sin(rotation * 0.55 + config.phase * 2) *
                  geometry.baseRadius *
                  0.018;

                // Near particles are larger/sharper; far particles become softer
                // and lighter, creating fake depth without extra 3D rendering.
                const depthWave = 0.68 + 0.32 * (0.5 + 0.5 * Math.sin(angle + config.phase));
                const depthScale = 0.82 + depthWave * 0.36;
                const tangentRotation =
                  Math.atan2(Math.cos(angle) * ry, -Math.sin(angle) * rx) *
                  (180 / Math.PI);

                setX[i](
                  geometry.centerX +
                  Math.cos(angle) * rx +
                  gustX +
                  windBias
                );
                setY[i](
                  geometry.centerY +
                  Math.sin(angle) * ry +
                  gustY
                );
                setRotation[i](
                  tangentRotation * (0.42 + config.spinFactor * 0.5) +
                  Math.sin(angle * 1.6 + config.phase) * 7
                );
                setScaleX[i](
                  config.stretchX *
                  depthScale *
                  (1 + Math.sin(angle * 1.8 + config.phase) * 0.08)
                );
                setScaleY[i](
                  config.stretchY *
                  depthScale *
                  (1 + Math.cos(angle * 1.35 + config.phase) * 0.08)
                );
                setOpacity[i](
                  Math.max(
                    0.045,
                    config.opacity * (0.52 + depthWave * 0.62)
                  )
                );
              });
            },
          });

          const resizeObserver = new ResizeObserver(updateOrbitGeometry);
          resizeObserver.observe(card);

          return () => {
            resizeObserver.disconnect();
            orbitTween.kill();
          };
        }

      }
    },
    { scope: sectionRef, dependencies: [defaultImg, jutsuImg, sixPathsImg, sandImg] }
  );

  const handleMouseEnter = () => {
    gsap.to(defaultImgRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.out",
      overwrite: "auto",
    });
    gsap.to(jutsuImgRef.current, {
      opacity: 0,
      scale: 1,
      duration: 0.22,
      ease: "power2.out",
      overwrite: "auto",
    });
    gsap.to(sixPathsImgRef.current, {
      opacity: 1,
      scale: 1.045,
      duration: 0.45,
      ease: "power3.out",
      overwrite: "auto",
    });
    gsap.to(chakraAuraRef.current, {
      opacity: 1,
      scale: 1.06,
      duration: 0.38,
      ease: "power2.out",
      overwrite: "auto",
    });
    gsap.to(chakraCoreRef.current, {
      opacity: 1,
      scale: 1.1,
      duration: 0.28,
      ease: "power2.out",
      overwrite: "auto",
    });
    gsap.to(chakraRingRefs.map((ref) => ref.current), {
      opacity: 1,
      scale: 1.035,
      duration: 0.28,
      stagger: 0.04,
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
      duration: 0.22,
      ease: "power2.out",
      overwrite: "auto",
    });
    gsap.to(sixPathsImgRef.current, {
      opacity: 0,
      scale: 1,
      duration: 0.28,
      ease: "power2.out",
      overwrite: "auto",
    });
    gsap.to(chakraAuraRef.current, {
      opacity: 0,
      scale: 0.98,
      duration: 0.32,
      ease: "power2.out",
      overwrite: "auto",
    });
    gsap.to(chakraCoreRef.current, {
      opacity: 0,
      scale: 0.96,
      duration: 0.26,
      ease: "power2.out",
      overwrite: "auto",
    });
    gsap.to(chakraRingRefs.map((ref) => ref.current), {
      opacity: 0,
      duration: 0.24,
      overwrite: "auto",
    });
  };

  return (
    <section
      ref={sectionRef}
      className="w-full py-12 md:py-16 min-h-auto md:min-h-[90vh] flex flex-col items-center"
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
            className="pointer-events-none absolute bottom-[-2%] left-1/2 z-[55] h-[min(210px,30vh)] w-[min(900px,115%)] -translate-x-1/2 overflow-visible"
            style={{ opacity: 0, transformOrigin: "50% 88%" }}
            aria-hidden="true"
          >
            {DUST_PARTICLES.map((particle, i) => (
              <span
                key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${50 + Math.cos(particle.angle) * particle.distance * 42}%`,
                    top: `${86 + particle.y * 100 + Math.sin(particle.angle) * particle.distance * 8}%`,
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
                    transform: `rotate(${particle.rotate}deg)`,
                    display: isMobile && i >= MOBILE_DUST_COUNT ? "none" : undefined,
                  }}
              />
            ))}
          </div>

          <div
            ref={dustFrontRef}
            className="pointer-events-none absolute bottom-[-1%] left-1/2 z-[80] h-[min(190px,28vh)] w-[min(900px,115%)] -translate-x-1/2"
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
                  className="relative w-full flex-1 min-h-[350px] sm:min-h-[500px] md:min-h-[620px] lg:min-h-[720px] overflow-hidden rounded-lg flex items-center justify-center mt-4"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Six Paths chakra aura — INSIDE the Madara card image area. */}
          <div
            ref={chakraAuraRef}
            className="pointer-events-none absolute inset-[-9%] z-[10] overflow-hidden rounded-lg"
            style={{ opacity: 0, transformOrigin: "50% 72%", mixBlendMode: "screen" }}
            aria-hidden="true"
          >
            {/* Soft atmosphere / hot inner core. */}
            <div
              ref={chakraCoreRef}
              className="absolute inset-[8%] rounded-[48%]"
              style={{
                opacity: 0,
                background:
                  "radial-gradient(ellipse at 50% 62%, rgba(255,255,255,.92) 0%, rgba(243,234,255,.72) 14%, rgba(211,187,255,.48) 30%, rgba(164,111,255,.26) 52%, rgba(105,49,225,.10) 70%, transparent 86%)",
                filter:
                  "blur(24px) drop-shadow(0 0 18px rgba(235,220,255,.95)) drop-shadow(0 0 55px rgba(151,93,255,.65))",
              }}
            />

            {/* Large irregular flame sheets. Their jagged silhouettes are closer to anime chakra than perfect rings. */}
            {chakraRingRefs.map((ref, index) => {
              const flameShapes = [
                {
                  clipPath: "polygon(49% 100%, 34% 92%, 27% 81%, 14% 75%, 20% 63%, 6% 56%, 17% 47%, 9% 34%, 24% 37%, 20% 22%, 35% 29%, 42% 8%, 49% 22%, 56% 4%, 61% 26%, 76% 14%, 72% 35%, 91% 30%, 82% 46%, 97% 52%, 84% 60%, 94% 75%, 78% 73%, 74% 88%, 61% 91%)",
                  background: "linear-gradient(180deg, rgba(142,84,255,.72) 0%, rgba(102,49,222,.56) 38%, rgba(213,187,255,.62) 68%, rgba(255,255,255,.42) 100%)",
                  blur: "blur(9px)",
                  opacity: 0.76,
                },
                {
                  clipPath: "polygon(50% 100%, 38% 86%, 22% 88%, 28% 72%, 7% 76%, 20% 59%, 2% 55%, 22% 46%, 10% 31%, 29% 37%, 27% 17%, 42% 29%, 50% 0%, 58% 28%, 70% 10%, 71% 34%, 91% 24%, 81% 45%, 100% 48%, 82% 61%, 94% 78%, 75% 72%, 76% 91%, 60% 85%)",
                  background: "linear-gradient(180deg, rgba(83,36,190,.58) 0%, rgba(132,76,255,.48) 36%, rgba(217,193,255,.50) 66%, rgba(255,255,255,.22) 100%)",
                  blur: "blur(15px)",
                  opacity: 0.58,
                },
                {
                  clipPath: "polygon(50% 100%, 30% 90%, 20% 74%, 4% 70%, 17% 53%, 3% 42%, 19% 37%, 15% 19%, 32% 29%, 43% 5%, 51% 25%, 61% 3%, 66% 27%, 84% 18%, 78% 36%, 97% 42%, 83% 53%, 96% 67%, 77% 71%, 70% 88%, 58% 89%)",
                  background: "radial-gradient(ellipse at 50% 58%, rgba(255,255,255,.54) 0%, rgba(203,173,255,.46) 26%, rgba(132,74,248,.42) 52%, rgba(74,30,176,.18) 74%, transparent 88%)",
                  blur: "blur(20px)",
                  opacity: 0.48,
                },
              ][index];

              return (
                <div
                  key={index}
                  ref={ref}
                  className="absolute inset-[5%]"
                  style={{
                    clipPath: flameShapes.clipPath,
                    background: flameShapes.background,
                    filter: `${flameShapes.blur} drop-shadow(0 0 14px rgba(143,92,255,.58))`,
                    opacity: 0,
                    transformOrigin: "50% 72%",
                    mixBlendMode: "screen",
                  }}
                />
              );
            })}

            {/* Bright inner flame tongues: white-violet center, deep violet outer edges. */}
            {[
              { className: "left-[8%] top-[4%] h-[45%] w-[18%] rotate-[-13deg]", clip: "polygon(50% 100%, 15% 74%, 42% 57%, 14% 38%, 48% 42%, 56% 0%, 68% 43%, 93% 24%, 76% 61%, 92% 79%)" },
              { className: "left-[23%] top-[-4%] h-[34%] w-[13%] rotate-[-5deg]", clip: "polygon(48% 100%, 19% 73%, 40% 48%, 22% 25%, 52% 43%, 60% 0%, 72% 47%, 96% 21%, 81% 70%)" },
              { className: "right-[8%] top-[1%] h-[47%] w-[19%] rotate-[14deg]", clip: "polygon(52% 100%, 12% 77%, 35% 58%, 7% 34%, 43% 44%, 54% 0%, 67% 46%, 91% 18%, 79% 61%, 96% 79%)" },
              { className: "right-[24%] top-[-5%] h-[36%] w-[13%] rotate-[6deg]", clip: "polygon(50% 100%, 17% 70%, 42% 48%, 20% 26%, 52% 41%, 62% 0%, 70% 46%, 97% 23%, 79% 71%)" },
              { className: "left-1/2 top-[-9%] h-[41%] w-[17%] -translate-x-1/2", clip: "polygon(50% 100%, 22% 72%, 40% 50%, 30% 27%, 51% 39%, 58% 0%, 69% 41%, 89% 21%, 76% 68%)" },
            ].map((tongue, i) => (
              <div
                key={i}
                className={`absolute ${tongue.className}`}
                style={{
                  clipPath: tongue.clip,
                  background: i % 2 === 0
                    ? "linear-gradient(180deg, rgba(248,242,255,.82), rgba(204,173,255,.64) 42%, rgba(120,67,238,.34) 80%, transparent)"
                    : "linear-gradient(180deg, rgba(211,190,255,.74), rgba(151,98,255,.48) 50%, rgba(82,34,190,.22) 82%, transparent)",
                  filter: "blur(10px) drop-shadow(0 0 14px rgba(224,207,255,.65))",
                  opacity: i === 4 ? 0.82 : 0.58,
                  mixBlendMode: "screen",
                }}
              />
            ))}

            {/* Wispy side plumes for the broad, turbulent silhouette. */}
            <div
              className="absolute left-[-5%] top-[27%] h-[45%] w-[32%] rotate-[-18deg]"
              style={{
                borderRadius: "50% 50% 42% 58%",
                background: "radial-gradient(ellipse at 80% 50%, rgba(229,213,255,.38), rgba(142,89,255,.26) 44%, transparent 78%)",
                filter: "blur(24px)",
                opacity: 0.62,
                mixBlendMode: "screen",
              }}
            />
            <div
              className="absolute right-[-5%] top-[24%] h-[48%] w-[32%] rotate-[17deg]"
              style={{
                borderRadius: "50% 50% 58% 42%",
                background: "radial-gradient(ellipse at 20% 50%, rgba(229,213,255,.38), rgba(135,83,252,.24) 45%, transparent 78%)",
                filter: "blur(26px)",
                opacity: 0.58,
                mixBlendMode: "screen",
              }}
            />

            {/* Hot edge glow: this is what makes the aura read as illuminated chakra. */}
            <div
              className="absolute inset-[10%] rounded-[46%]"
              style={{
                border: "1px solid rgba(244,236,255,.28)",
                boxShadow:
                  "0 0 24px rgba(245,237,255,.34), 0 0 54px rgba(143,89,255,.34), inset 0 0 42px rgba(147,94,255,.16)",
                filter: "blur(2px)",
                opacity: 0.72,
                mixBlendMode: "screen",
              }}
            />
          </div>

                  <img
                    ref={defaultImgRef}
                    src={defaultImg}
                    alt="Madara Uchiha"
                    className="absolute inset-0 z-[20] w-full h-full object-contain"
                  />
                  <img
                    ref={jutsuImgRef}
                    src={jutsuImg}
                    alt="Madara Susanoo"
                    className="absolute inset-0 z-[20] w-full h-full object-contain"
                    style={{ opacity: 0 }}
                  />
                  <img
                    ref={sixPathsImgRef}
                    src={sixPathsImg}
                    alt="Madara Six Paths"
                    className="absolute inset-0 z-[20] w-full h-full object-contain"
                    style={{ opacity: 0 }}
                  />
                </div>
              </div>
              <div className="w-full p-4 sm:p-6 md:p-8 lg:p-10 pt-4 md:pt-5 pb-8 sm:pb-12 lg:pb-14 mt-auto">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 mx-0 sm:mx-4 md:mx-6 lg:mx-8">
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
                    className="flex-1 h-[52px] sm:h-[64px] md:h-[68px] lg:h-[72px] px-4 sm:px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[13px] sm:text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                    style={{ backgroundColor: "#F4E9D3", color: "#1A1A1A" }}
                  >
                    <span>ADD TO CART</span>
                    <span className="font-inter text-[12px] sm:text-[13px] md:text-[14px] font-semibold">
                      $49.99
                    </span>
                  </button>
                  <Link
                    href="/product/madara"
                    className="flex-1 h-[52px] sm:h-[64px] md:h-[68px] lg:h-[72px] px-4 sm:px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[13px] sm:text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                    style={{
                      backgroundColor: "transparent",
                      color: "white",
                      border: "1.5px solid white",
                    }}
                  >
                    <span>VIEW PRODUCT</span>
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
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

          {/*
           * Edo Tensei coffin shell.
           * The shell stays BEHIND the card so the card content remains visible in the final state.
           * Only the front door temporarily sits above the card while it is closed.
           */}
          <div
            ref={coffinRef}
            className="pointer-events-none absolute left-1/2 top-[-40px] md:top-[-90px] z-[60] h-[calc(100%+80px)] md:h-[calc(100%+180px)] w-[calc(100%+80px)] md:w-[calc(100%+140px)] max-w-[840px] -translate-x-1/2"
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
                className="absolute inset-x-0 top-0 h-[12%] rounded-t-[12px] z-[1]"
                style={{
                  background:
                    "linear-gradient(90deg, #3b2519, #8d6035 12%, #a77743 30%, #5f3b20 48%, #9b6d3c 70%, #49301b 88%, #2d1b11), repeating-linear-gradient(90deg, rgba(35,20,12,.25) 0 3px, transparent 3px 30px)",
                  boxShadow: "inset 0 -8px 18px rgba(0,0,0,.28)",
                }}
              />
              <div
                className="absolute inset-y-0 left-0 w-[8%] rounded-l-[12px] z-[1]"
                style={{
                  background: "linear-gradient(90deg, #2d1b11, #714a2a 45%, #9b6d3c 72%, #3b2519)",
                }}
              />
              <div
                className="absolute inset-y-0 right-0 w-[8%] rounded-r-[12px] z-[1]"
                style={{
                  background: "linear-gradient(90deg, #3b2519, #9b6d3c 28%, #714a2a 55%, #2d1b11)",
                }}
              />
              <div
                className="absolute inset-x-0 bottom-0 h-[9%] rounded-b-[12px] z-[1]"
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
                className="absolute inset-[7%] z-[50] rounded-[8px]"
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
                className="absolute bottom-[1%] left-[2%] right-[2%] z-[2] h-[24px] rounded-b-[10px]"
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
            className="pointer-events-none absolute -inset-[16%] z-[95] overflow-visible"
            aria-hidden="true"
          >
            <div
              className="pointer-events-none absolute inset-[14%] rounded-[45%] opacity-55"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(205,170,102,.16) 0%, rgba(180,141,79,.10) 34%, rgba(132,95,47,.05) 56%, transparent 76%)",
                filter: "blur(22px)",
                mixBlendMode: "screen",
              }}
            />
            {ORBIT_CONFIGS.map((config, i) => (
              <img
                key={i}
                src={sandImg}
                alt=""
                className="absolute left-0 top-0 object-contain"
                style={{
                  width: `${config.size}px`,
                  height: `${config.size * (0.48 + config.stretchY * 0.42)}px`,
                  opacity: config.opacity,
                  willChange: "transform, opacity",
                  filter: `blur(${config.blur}px) saturate(.82) sepia(.14)`,
                  mixBlendMode: "screen",
                  display: isMobile && i >= MOBILE_SAND_COUNT ? "none" : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}