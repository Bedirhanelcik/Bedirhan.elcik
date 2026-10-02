/**
 * Pinned, scrubbed reading sweep
 * ------------------------------
 *
 * A statement paragraph is pinned to the viewport and colours itself word by
 * word as the reader scrolls through it: a short band of accent colour travels
 * along the sentence like a reading cursor, and the words behind it settle into
 * ink.
 *
 * The parts that matter, and why:
 *
 * - **Two staggered waves, not one.** The effect is a single word list tweened
 *   twice — once to the accent colour, once to ink — with the second tween
 *   offset by a small lag. The gap between the two waves *is* the visible band.
 *   Expressing it this way means the band has one tuning knob (`INK_LAG`)
 *   instead of per-word bookkeeping, and it stays correct for any word count.
 *
 * - **The band is deliberately narrow.** At any resting scroll position only
 *   two or three words are accented, so it reads as a reading cursor rather
 *   than a paragraph stuck on the brand colour. A short tail is appended to the
 *   timeline so the last word has finished settling before the pin releases.
 *
 * - **Scrubbed, not played.** Scroll position is the playhead, so the reader
 *   controls the sweep in both directions. A small `scrub` value (0.6) smooths
 *   wheel jitter without decoupling the animation from the scroll.
 *
 * - **The entrance is a separate trigger.** The pin only engages when the
 *   section reaches the top of the viewport, so putting the entrance on the
 *   scrubbed timeline would leave a viewport of empty page before anything
 *   appeared. The paragraph fades in on its own earlier trigger and is already
 *   sitting there, neutral, when the pin takes over.
 *
 * - **`end` is a function and `invalidateOnRefresh` is set.** The pin distance
 *   is expressed in viewport heights, so it has to be re-measured on resize
 *   rather than baked in at setup.
 *
 * - **It bails out without layout.** Pinning rewrites the DOM around the
 *   section and measures it against the viewport. Where there is no layout
 *   engine (a test environment, a hidden mount) the paragraph is left in its
 *   static, fully readable CSS state instead of being half-transformed.
 */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Accent colour: the word currently being read. */
const ACCENT = "#fe2f00";
/** Where a word settles once the reader has passed it. */
const INK = "#1a1a1a";

/** Timeline seconds the accent wave takes to cross the whole paragraph. */
const READ_SPAN = 1.3;
/** Seconds a single word spends crossing into the accent colour. */
const ACCENT_DURATION = 0.16;
/** Seconds a single word spends easing from accent down into ink. */
const INK_DURATION = 0.18;
/** How far the ink wave trails the accent wave — the width of the band. */
const INK_LAG = 0.11;
/** A beat after the pin engages before the sweep starts. */
const READ_START = 0.15;

/** Viewport heights of scroll the pin consumes. Shorter on small screens. */
const DISTANCE_VH = 2.2;
const DISTANCE_VH_MOBILE = 1.6;

export interface ReadingSweepTargets {
  section: HTMLElement;
  /** One element per word. Split the paragraph in the view layer, not here. */
  words: HTMLElement[];
}

/**
 * Returns a teardown function. The timeline is built inside a `gsap.context`
 * so that reverting it also removes the pin wrapper and the inline styles
 * ScrollTrigger added — important because the word list is rebuilt whenever
 * the copy changes (for example on a language switch) and the previous
 * timeline's targets no longer exist in the DOM.
 */
export function createReadingSweep({ section, words }: ReadingSweepTargets): () => void {
  if (words.length === 0 || section.offsetHeight === 0) return () => {};

  const ctx = gsap.context(() => {
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () =>
          "+=" +
          window.innerHeight * (window.innerWidth < 640 ? DISTANCE_VH_MOBILE : DISTANCE_VH),
        pin: true,
        pinSpacing: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });

    // `each` rather than a total stagger: the band's travel time should be the
    // same whatever the word count, so the per-word step is derived from it.
    const each = READ_SPAN / Math.max(words.length - 1, 1);

    timeline.to(
      words,
      { color: ACCENT, duration: ACCENT_DURATION, ease: "none", stagger: { each } },
      READ_START
    );
    timeline.to(
      words,
      { color: INK, duration: INK_DURATION, ease: "none", stagger: { each } },
      READ_START + INK_LAG
    );

    // Empty tail: holds the pin briefly after the last word has settled.
    timeline.to({}, { duration: 0.2 });
  }, section);

  return () => ctx.revert();
}

/**
 * The un-read colour of a word lives in CSS (`.about-word`), not in a GSAP
 * `from` value. The section is server-rendered, so a start state that exists
 * only inside a tween is not applied until hydration — see
 * `hydration-safe-intro.ts` for the same decision made for the hero.
 */
