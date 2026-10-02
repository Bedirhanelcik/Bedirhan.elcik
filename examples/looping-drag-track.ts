/**
 * Seamless looping, draggable track
 * ---------------------------------
 *
 * A horizontal gallery that drifts on its own, can be dragged or trackpad-
 * swiped, and never reaches an end. The interesting decisions are not the
 * animation — they are about ownership of the transform, what "seamless"
 * actually requires, and how the same gesture should feel on a mouse and on
 * glass.
 *
 * **One owner for the transform.** GSAP's Draggable drives an off-DOM proxy
 * element, never the track. Draggable owns the proxy's transform and this
 * module owns the track's, so the wrapping arithmetic can never disagree with
 * Draggable's idea of where the element is — and no `update()`/resync calls are
 * needed after a wrap. Letting both write the same transform is the usual way
 * this kind of component ends up jumping on the first wrap after a drag.
 *
 * **Seamlessness is an invariant, not a vibe.** The set is rendered twice and
 * the offset is wrapped into `[-setWidth, 0]`. Those two facts together are
 * what guarantee no edge is ever exposed: at any offset in that range, two
 * rendered sets still span the viewport. Written as `setWidth >= viewportWidth`
 * it becomes something a unit test can assert, which is why it lives in a
 * separate pure module in the real project rather than implicitly inside the
 * component.
 *
 * **The step is measured, not assumed.** Cards are sized `min(84vw, 560px)`, so
 * on a narrow viewport the real step is smaller than the constant. Reading it
 * from laid-out DOM (`second.offsetLeft - first.offsetLeft`) keeps the wrap
 * aligned with what is actually on screen.
 *
 * **Rounded on paint, precise in state.** The track is a promoted compositing
 * layer (`will-change: transform`), and a layer parked on a fractional offset
 * gets resampled — which makes the card artwork look soft and over-compressed.
 * So the painted value is snapped to whole pixels while `x` itself keeps full
 * precision, and the slow drift stays smooth.
 *
 * **Damping is per pointer type.** A mouse drag can be pulled across the whole
 * desk, so sub-1:1 damping is what gives the track weight. A finger swipe is
 * short and self-limiting — the hand leaves the glass — so the same damping
 * makes it feel like the track barely moves. Coarse pointers get a near 1:1
 * response instead. Same gesture, different physics, because the input is
 * physically different.
 *
 * **No inertia on release.** Releasing ends the gesture exactly where the hand
 * left it: no throw, no snap-back. The only thing that happens on release is
 * the countdown before the ambient drift creeps back.
 */

import gsap from "gsap";
import { Draggable } from "gsap/Draggable";

gsap.registerPlugin(Draggable);

/** Wraps a value into `[min, max)`, correct for negative input. */
export function wrap(value: number, min: number, max: number): number {
  const range = max - min;
  if (range <= 0) return min;
  return min + (((value - min) % range) + range) % range;
}

/** Ambient travel in px/sec, and how long a gesture suppresses it. */
const DRIFT_SPEED_PX_PER_SEC = 42;
const RESUME_DELAY_MS = 2000;

/** Fraction of raw pointer travel the track moves. */
const DRAG_DAMPING = 0.4;
const TOUCH_DRAG_DAMPING = 0.95;

/** Pointer travel above which a gesture is a drag, not a click. */
const CLICK_SLOP = 8;

/**
 * The drift is a tiny state machine rather than a boolean plus a `setTimeout`:
 * it advances on the same clock as the render loop, so pausing and resuming
 * cannot drift out of step with the frames that are actually being painted,
 * and it is testable without fake timers.
 */
export function createDriftController(speedPxPerSec: number, resumeDelayMs = 600) {
  let paused = false;
  let elapsed = 0;
  let resumeAt = 0;

  return {
    /** Pixels to travel this frame; 0 while paused. */
    tick(deltaMs: number): number {
      elapsed += deltaMs;
      if (paused) {
        if (elapsed < resumeAt) return 0;
        paused = false;
      }
      return (speedPxPerSec * deltaMs) / 1000;
    },
    pause() {
      paused = true;
      resumeAt = elapsed + resumeDelayMs;
    },
  };
}

/** `track` must contain the item set rendered twice. Returns a teardown. */
export function createLoopingTrack(track: HTMLElement, setCount: number): () => void {
  const first = track.children[0] as HTMLElement | undefined;
  const second = track.children[1] as HTMLElement | undefined;
  if (!first || !second) return () => {};

  const step = second.offsetLeft - first.offsetLeft;
  const setWidth = step * setCount;
  const lowerBound = -setWidth;

  let x = 0;
  const applyX = () => {
    x = wrap(x, lowerBound, 0);
    track.style.transform = `translate3d(${Math.round(x)}px, 0, 0)`;
  };
  applyX();

  const drift = createDriftController(DRIFT_SPEED_PX_PER_SEC, RESUME_DELAY_MS);
  let lastTime = performance.now();
  let rafId = requestAnimationFrame(function tick(now: number) {
    const delta = drift.tick(now - lastTime);
    lastTime = now;
    if (delta !== 0) {
      x -= delta; // leftward travel reveals later items
      applyX();
    }
    rafId = requestAnimationFrame(tick);
  });

  const proxy = document.createElement("div");
  let lastProxyX = 0;
  let gestureTravel = 0;

  const coarse =
    typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  const damping = coarse ? TOUCH_DRAG_DAMPING : DRAG_DAMPING;

  const consume = (proxyX: number) => {
    const delta = proxyX - lastProxyX;
    lastProxyX = proxyX;
    gestureTravel += Math.abs(delta);
    x += delta * damping;
    applyX();
  };

  const [draggable] = Draggable.create(proxy, {
    type: "x",
    trigger: track,
    // Items are links; without this a gesture that starts on one is ignored.
    dragClickables: true,
    // A horizontal swipe drives the track, a vertical one still scrolls the
    // page. Without this the track swallows vertical touches and a reader on a
    // phone can get stuck inside the gallery.
    allowNativeTouchScrolling: true,
    inertia: false,
    onPress() {
      drift.pause();
      lastProxyX = this.x;
      gestureTravel = 0;
    },
    onDrag() {
      consume(this.x);
    },
    onRelease() {
      drift.pause();
    },
  });

  // A gesture that actually moved the track must not also open the item under
  // the pointer. Capture phase, so it runs before the link's default action.
  const onClickCapture = (event: MouseEvent) => {
    if (gestureTravel <= CLICK_SLOP) return;
    event.preventDefault();
    event.stopPropagation();
  };
  track.addEventListener("click", onClickCapture, true);

  // Horizontal trackpad gestures drive the track directly; anything with a
  // larger vertical component is left to the page so smooth scrolling keeps it.
  const onWheel = (event: WheelEvent) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    drift.pause();
    x -= event.deltaX;
    applyX();
  };
  track.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    cancelAnimationFrame(rafId);
    draggable.kill();
    track.removeEventListener("click", onClickCapture, true);
    track.removeEventListener("wheel", onWheel);
  };
}
