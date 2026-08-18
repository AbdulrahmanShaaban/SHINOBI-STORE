"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Waits for fonts and the window load event, then refreshes every
 * ScrollTrigger once — so all pinned distances and trigger positions
 * are calculated against the final, settled layout rather than a
 * mid-font-swap snapshot.
 */
export default function ScrollRefresh() {
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();

    document.fonts.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      window.removeEventListener("load", refresh);
    };
  }, []);

  return null;
}