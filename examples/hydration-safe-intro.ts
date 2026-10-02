/**
 * A page-entrance animation that survives hydration
 * -------------------------------------------------
 *
 * This is the least visual and most useful example here. It is about the gap
 * between first paint and hydration, and why a start state that lives only
 * inside a tween is a bug on a server-rendered page.
 *
 * **The failure.** The hero is server-rendered, so the browser paints it long
 * before the client bundle has run and the GSAP timelines exist. Measured in
 * development that gap was around 600ms — document interactive at ~418ms, the
 * last client chunk finishing at ~1027ms. With the start offsets declared only
 * in `gsap.fromTo(...)`, the first paint showed the *finished* composition, the
 * `from` values then landed retroactively whenever hydration completed, and the
 * hero appeared, snapped back to invisible, and played in. How much of that was
 * visible depended entirely on cache warmth and how busy the main thread was
 * decoding the hero image and its autoplaying video — which is why the entrance
 * looked animated on one refresh and static on the next.
 *
 * **The fix.** Declare the start state in CSS, which the server ships in the
 * same response as the markup, and let the timeline's numbers merely *agree*
 * with it. Nothing can be mid-animation before the animation exists, because
 * the start state is applied by the first paint.
 *
 * **The duplication is deliberate, and tested.** The offsets now exist twice —
 * once in CSS, once here. That is a real cost, so it is paid for with a test
 * that parses the stylesheet and asserts the two agree. Silent drift between
 * them is the only way this arrangement can fail, so that is the thing the
 * test watches.
 *
 * **The armed attribute.** The CSS start state is scoped to
 * `[data-intro-armed]` on `<html>`, set by a tiny inline script in the document
 * head — before the hero is parsed. A visitor without working JavaScript never
 * gets the attribute, so they never get the hidden start state either; they are
 * served the hero already visible rather than a permanently blank one. The same
 * attribute is removed when the entrance finishes, so the document stops
 * carrying a flag whose only job is to hide things.
 *
 * **Reduced motion.** Readers who asked for less motion are not shown the start
 * state at all — not even the pre-hydration frame of it. A media query inside
 * the armed block neutralises it, and the timeline bails out before it is
 * built, so nothing animates out of a state they never saw.
 */

import gsap from "gsap";

/**
 * Start offsets. Each one is declared a second time in the stylesheet under
 * `[data-intro-armed]`, and a unit test asserts the two sets match.
 */
export const INTRO_START = {
  /** Name lines — a percentage, so travel scales with the clamped display type. */
  lineYPercent: 22,
  /** Role, supporting copy, footer bar. */
  tailY: 20,
  /** Floating media panels. */
  mediaY: 28,
} as const;

export const INTRO_ARMED_ATTR = "data-intro-armed";

/**
 * Guarded past `typeof window` and past `matchMedia` itself: the test
 * environment has a DOM but no `matchMedia`, and an unguarded call there turns
 * a motion preference check into a crash on mount.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Hands the document back to plain, fully visible rendering. */
export function disarmIntro(): void {
  document.documentElement.removeAttribute(INTRO_ARMED_ATTR);
}

export function playIntro(lines: HTMLElement[], tail: HTMLElement[]): void {
  // Skipped outright rather than shortened: the start state was never shown to
  // this reader, so there is nothing to animate out of.
  if (prefersReducedMotion()) {
    disarmIntro();
    return;
  }

  const timeline = gsap.timeline({ onComplete: disarmIntro });

  // `to`, not `fromTo`. The start state is already on screen — asserting it
  // again here is what reintroduces the flash.
  timeline.to(lines, {
    yPercent: 0,
    autoAlpha: 1,
    duration: 1.1,
    ease: "power3.out",
    stagger: 0.08,
  });
  timeline.to(tail, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power2.out" }, 0.35);
}

/**
 * The CSS half:
 *
 *   [data-intro-armed] [data-intro] { opacity: 0; visibility: hidden; }
 *   [data-intro-armed] [data-intro="line"]  { transform: translate(0, 22%); }
 *   [data-intro-armed] [data-intro="tail"]  { transform: translate(0, 20px); }
 *   [data-intro-armed] [data-intro="media"] { transform: translate(0, 28px); }
 *
 *   @media (prefers-reduced-motion: reduce) {
 *     [data-intro-armed] [data-intro] {
 *       opacity: 1; visibility: visible; transform: none;
 *     }
 *   }
 */
