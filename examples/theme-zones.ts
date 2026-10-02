/**
 * Reversible theme zones
 * ----------------------
 *
 * The page moves between a light (paper) and a dark state several times on the
 * way down. Each change is a single class flip at a declared scroll point, and
 * CSS owns the smoothing.
 *
 * **Why discrete flips rather than a scrubbed colour sweep.** A scroll-scrubbed
 * background interpolation sounds more sophisticated and behaves worse: on a
 * fast wheel gesture the scrubbed value outruns any time-based CSS transition
 * on the same element, and foreground text can land on a background it has no
 * contrast against for a few frames. A class flip plus one CSS transition is
 * always internally consistent — every colour in the zone is interpolating on
 * the same clock, and there is only one of them to reason about.
 *
 * **Why the stops are a list.** The sequence is data, so the interesting
 * question — "which state should the page be in here?" — is answered by reading
 * one array instead of tracing several independent triggers. Each stop also
 * knows the state of the stop *before* it, which is what makes the whole
 * sequence reversible: `onLeaveBack` restores the previous state, so the page
 * is correct however the reader moves, including a jump-scroll back up.
 *
 * **Why the flip points are offsets, not section boundaries.** The point of a
 * flip is where it *feels* right, which is rarely where a section begins. The
 * hand-off back to paper is held until the next section is genuinely arriving
 * (`top 86%`) — close enough that the reader reads it as one movement, but far
 * enough ahead that the repaint has finished before that section pins and
 * starts animating.
 */

import { ScrollTrigger } from "gsap/ScrollTrigger";

export interface ThemeStop {
  /** Element whose arrival flips the zone. */
  selector: string;
  /** ScrollTrigger `start` expression for the flip point. */
  start: string;
  /** Zone state once this stop is passed. */
  dark: boolean;
}

/** Zone state before any stop has been passed. */
const INITIAL_DARK = false;

const THEME_STOPS: ThemeStop[] = [
  // Halfway through the service list, measured from the row's own centre.
  { selector: "#services-midpoint", start: "center bottom", dark: true },
  // Back to paper *before* the statement section pins, not as it pins.
  { selector: "#about", start: "top 86%", dark: false },
  { selector: "#tech", start: "top 72%", dark: true },
];

/**
 * `root` carries the zone class; the CSS transition lives on it. Returns a
 * teardown that kills every trigger — ScrollTrigger instances are global, so
 * leaving them behind means a stale element reference keeps flipping classes.
 */
export function createThemeZones(root: HTMLElement, stops: ThemeStop[] = THEME_STOPS) {
  const apply = (dark: boolean) => root.classList.toggle("zone-dark", dark);
  apply(INITIAL_DARK);

  const triggers = stops.map((stop, index) => {
    const target = root.querySelector<HTMLElement>(stop.selector);
    // A missing anchor is skipped rather than thrown on: sections are
    // conditionally rendered, and a half-built trigger list is worse than a
    // short one.
    if (!target) return null;

    const previous = index === 0 ? INITIAL_DARK : stops[index - 1].dark;

    return ScrollTrigger.create({
      trigger: target,
      start: stop.start,
      onEnter: () => apply(stop.dark),
      onLeaveBack: () => apply(previous),
    });
  });

  return () => triggers.forEach((trigger) => trigger?.kill());
}

/**
 * The CSS side, for completeness:
 *
 *   .zone {
 *     background-color: var(--color-paper);
 *     color: var(--color-graphite);
 *     border-color: var(--color-taupe);
 *     transition:
 *       background-color 0.6s var(--ease-settle),
 *       color 0.6s var(--ease-settle),
 *       border-color 0.6s var(--ease-settle);
 *   }
 *   .zone.zone-dark {
 *     background-color: var(--color-ink);
 *     color: var(--color-paper);
 *     border-color: #3a3a38;
 *   }
 *
 * `border-color` is in that list on purpose. The details that get forgotten
 * when a theme change is driven per element from JavaScript are exactly these
 * — rules, row dividers, numerals — and they are the ones a reader notices,
 * because a divider left on the old palette is invisible against the new
 * background. Inheriting from the zone means they are never missed.
 */
