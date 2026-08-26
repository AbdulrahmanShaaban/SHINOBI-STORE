"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Keeps GSAP ScrollTrigger measurements honest:
 * - once after fonts settle and on window load (first paint accuracy), and
 * - after every client-side route change. Root-layout components never remount
 *   on App Router navigation, so without the pathname trigger the refresh
 *   would run exactly once per full page load — leaving pinned/pin-spacer
 *   sections measured against the PREVIOUS page's layout (stale spacer
 *   heights are a prime suspect for "scroll sometimes freezes until
 *   refresh").
 *
 * Skipped on /admin routes — admin pages do not use GSAP scroll pins.
 */
export default function ScrollRefresh() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const refresh = () => ScrollTrigger.refresh();

    document.fonts.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      window.removeEventListener("load", refresh);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname === null || pathname.startsWith("/admin")) return;
    // Two frames: let the new route's DOM commit and layout settle, then
    // re-measure every trigger (pin distances, start/end positions).
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => ScrollTrigger.refresh())
    );
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
