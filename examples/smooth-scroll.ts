/**
 * Lenis <-> GSAP ScrollTrigger synchronisation
 * -------------------------------------------
 *
 * Smooth scrolling and scroll-driven animation are two systems that both want
 * to own the frame. If each runs its own loop they disagree by a frame or two,
 * and every pinned or scrubbed animation on the page shivers.
 *
 * Three lines do the actual work:
 *
 *   1. `lenis.on("scroll", ScrollTrigger.update)` — ScrollTrigger stops
 *      sampling `window.scrollY` on its own schedule and is told, by Lenis,
 *      the moment the virtual scroll position changes.
 *   2. `gsap.ticker.add(...)` — Lenis is advanced *from GSAP's* ticker instead
 *      of its own `requestAnimationFrame`. One rAF loop for the whole page, so
 *      scroll position and tween playheads are always read in the same frame.
 *   3. `gsap.ticker.lagSmoothing(0)` — GSAP's lag smoothing exists to hide
 *      long frames by fabricating time. With scroll position as the animation
 *      input that is exactly wrong: it would desynchronise the playhead from
 *      the scroll on precisely the frames that are already struggling.
 *
 * Lenis' own `duration`/`easing` stay short (~0.7s, cubic ease-out). Heavier
 * smoothing reads as latency rather than weight, and it widens the gap between
 * where the reader thinks the page is and where a scrubbed timeline has got to.
 */

import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function initSmoothScroll(): () => void {
  const lenis = new Lenis({
    duration: 0.7,
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
  });

  lenis.on("scroll", ScrollTrigger.update);

  // Lenis expects milliseconds; GSAP's ticker reports seconds.
  const advance = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(advance);
  gsap.ticker.lagSmoothing(0);

  // Teardown matters more than it looks: in a framework with a dev-mode
  // double mount, or any client-side route change, a leaked ticker callback
  // keeps a destroyed Lenis instance alive and the page ends up with two
  // competing scroll drivers.
  return () => {
    gsap.ticker.remove(advance);
    lenis.destroy();
  };
}

/**
 * Plugin registration is kept in one module in the real project and guarded
 * with `typeof window !== "undefined"`, because the components that import
 * GSAP are also server-rendered and the plugins touch `document` on register.
 */
