"use client";

import { useEffect } from 'react';
import LocomotiveScroll from 'locomotive-scroll';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scrolling via Locomotive Scroll v5.
 *
 * Note: Locomotive v5 is itself built ON TOP OF Lenis (it wraps a Lenis
 * instance internally) — this migration replaces our hand-rolled Lenis
 * integration with Locomotive's higher-level wrapper (viewport detection,
 * data-scroll attributes, managed RAF). The scroll feel is configured through
 * the same Lenis options as before.
 *
 * GSAP integration: ScrollTrigger is synced on every Lenis scroll event via
 * `scrollCallback`, and the render loop stays on the shared GSAP ticker via
 * the custom-ticker hooks so both engines run on a single rAF.
 */
export default function SmoothScroll() {
  useEffect(() => {
    // Disable smooth scrolling on mobile — native touch scroll handles momentum
    if (window.matchMedia('(max-width: 767px)').matches) return;

    const locomotive = new LocomotiveScroll({
      lenisOptions: {
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      },
      scrollCallback: () => ScrollTrigger.update(),
      initCustomTicker: (render) => {
        gsap.ticker.add(render);
      },
      destroyCustomTicker: (render) => {
        gsap.ticker.remove(render);
      },
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      locomotive.destroy();
    };
  }, []);

  return null;
}
