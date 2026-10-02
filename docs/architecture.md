# Architecture notes

Implementation notes from the portfolio at [bedirhanelcik.com](https://bedirhanelcik.com).
The production source is private; this document records the decisions behind it,
and `../examples` holds the small, isolated pieces of code those decisions
produced.

## Shape of the application

A single Next.js App Router application. The page is one long server-rendered
document — hero, services, selected work, a pinned statement, technology, a
closing section, footer — with a separate contact route, and a single API route
that submits the enquiry form.

Client interactivity is pushed to the leaves. The layout composes a small number
of providers (language, smooth scroll, gallery cursor state) and everything
below them is either a server component or a client component that owns exactly
one interaction. The rule being followed is that `"use client"` marks a
behaviour, not a region of the page.

## The animation pipeline

There is one frame loop for the entire page.

Lenis provides the virtual scroll; GSAP provides the timelines. They are joined
at two points — Lenis notifies `ScrollTrigger.update` on every scroll event, and
Lenis is advanced from `gsap.ticker` rather than from its own
`requestAnimationFrame`. `gsap.ticker.lagSmoothing(0)` is then required, because
fabricating time to hide a long frame is precisely wrong when scroll position is
the animation input. See [`examples/smooth-scroll.ts`](../examples/smooth-scroll.ts).

Scroll-driven motion is divided into two kinds, and the distinction is load-bearing:

- **Scrubbed** — the scroll position *is* the playhead. Used where the reader
  should control the pace and be able to reverse it: the pinned statement's
  word-by-word reveal is the clearest case.
- **Triggered** — a one-shot tween fired as an element arrives, with
  `toggleActions` handling the way back up. Used for entrances, where scrubbing
  would tie a fade to a scroll distance the reader has no reason to associate
  with it.

Mixing them inside one section is a deliberate pattern rather than an
inconsistency: the statement section fades its paragraph in on a *triggered*
timeline and sweeps the colour through it on a *scrubbed* one, because the pin
only engages after the entrance has to be over.

## Pure logic lives outside the components

Anything with arithmetic in it — the gallery's wrap geometry and seamlessness
invariant, the centring offset, the drift state machine, the pointer-tracking
interpolation, the floating-media clamp, the scroll-direction tracker — is a
plain module with no DOM and no React, with its own unit tests. The components
are left to wire DOM to those functions.

This is what makes the motion work testable at all. A claim like "two rendered
copies of the set are enough that the loop never exposes an edge" is a statement
about numbers; expressed as a function (`setWidth >= viewportWidth`) it can be
asserted, and it stops being folklore sitting inside a 200-line component.

## Theming by zone, not by element

The page changes between a light and a dark palette several times on the way
down. One wrapper element carries a `zone-dark` class, discrete ScrollTrigger
stops flip it, and a CSS transition on that element does the smoothing.
Everything inside reads its colours by inheritance or from custom properties.

The alternative — scrubbing a background colour against scroll progress — was
rejected after it failed in the browser: on a fast wheel gesture the
scroll-driven value outran the time-based CSS transition on the same element and
text briefly sat on a background it had no contrast against. Related bug from
the same class: elements animated individually (row numerals) kept the old
palette while their surroundings changed. Inheritance from one zone element
fixes both. See [`examples/theme-zones.ts`](../examples/theme-zones.ts).

## Server-rendered pages and animation start states

A start state declared only inside `gsap.fromTo()` does not exist until the
client bundle has run. On a server-rendered hero that gap was measured at
roughly 600ms in development, and it showed: the finished composition painted,
snapped back to its start, then played in — intermittently, depending on cache
warmth and how busy the main thread was with media decoding.

So entrance start states are declared in CSS, scoped to a `data-intro-armed`
attribute that a synchronous inline script sets on `<html>` before the hero is
parsed. The timeline's numbers only have to *agree* with the stylesheet, and a
test asserts they do. Scoping to an attribute set by script also means a visitor
whose JavaScript never runs is served the hero visible rather than hidden
forever. See [`examples/hydration-safe-intro.ts`](../examples/hydration-safe-intro.ts).

## Interaction is conditioned on the input device, not the viewport width

Breakpoints describe how much room there is, not what the reader is pointing
with. Where the two differ, the input device wins:

- The custom cursor mounts only for `(pointer: fine)`, and `(pointer: coarse)`
  resets every CSS cursor at the stylesheet level.
- The gallery's drag damping is chosen per pointer type. A mouse drag can be
  pulled across a desk and needs sub-1:1 damping to have weight; a finger swipe
  is short and self-limiting, so the same damping makes it feel inert. Coarse
  pointers get a near 1:1 response.
- The gallery lets vertical touch gestures fall through to the page, so a reader
  on a phone can never get trapped inside a horizontal track.

`prefers-reduced-motion` is handled the same way — as a property of the reader
rather than of the layout. The hero entrance is skipped outright and its start
state neutralised, so nothing animates out of a state that was never shown.

## Media is served at source quality

Project artwork and video are served from the original files, with Next.js image
optimisation bypassed. For a portfolio the artwork *is* the content, and a
re-encoded or auto-generated derivative is a visible loss. The cost is accepted
deliberately; the mitigation is on the compositing side instead — the gallery
track snaps its painted offset to whole pixels, because a promoted layer parked
on a fractional offset gets resampled and makes sharp artwork look soft.

## Content and localisation

Copy, project data, service rows and technology lists are typed data modules,
not markup. The site is bilingual (English default, Turkish), so every string
is keyed by locale and the language switch re-renders from data rather than
swapping components. Switching language also moves `document.documentElement.lang`,
since assistive technology takes pronunciation from the document language and
not from what is on screen.

Where a language switch changes the *number* of elements an animation targets —
the statement paragraph has a different word count in each language — the
timeline is rebuilt inside a `gsap.context` and reverted, rather than retargeted.

## Verification

Vitest with Testing Library and jsdom covers component behaviour and the pure
logic modules. Typecheck and lint run in the same pass.

Tests are treated as necessary and not sufficient. Every change ends with the
site open in a browser and scrolled by hand, because the defects that have
actually shipped on this project were invisible to jsdom: a logo rendering the
wrong colour because of an ancestor's `mix-blend-mode`, numerals left behind
during a theme transition, a scroll-driven colour sweep outrunning a CSS
transition. Each of those is a composite or timing result that no assertion
about the DOM could have caught.
