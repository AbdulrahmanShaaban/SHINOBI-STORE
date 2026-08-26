"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import LocomotiveScroll from 'locomotive-scroll';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scrolling via Locomotive Scroll v5.
 *
 * Disabled on /admin routes — admin panels rely on native browser scroll
 * for sidebar and content overflow containers.
 */
export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    // Disable on admin routes — native scroll is required
    if (pathname.startsWith('/admin')) return;
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
  }, [pathname]);

  return null;
}
