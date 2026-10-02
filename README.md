# Bedirhan Elçik

 Full-Stack Developer. I build modern web products, interactive web experiences, and AI-powered systems.

**This is a public showcase, not the source code of my portfolio** — five isolated examples of engineering decisions from it, and notes on the architecture around them.

---

## About

A year ago I set out to build a personal portfolio and stopped. I had projects, but the work had not reached the level I wanted to represent professionally.

I have built and experimented with more than 100 projects, around 20 of which reached a production-ready level. That covered frontend development, backend work, full-stack applications, interactive web experiences and AI-powered products. I currently work as a freelance frontend developer and am moving towards larger, more structured professional work.

---

## Portfolio

**[bedirhanelcik.com](https://bedirhanelcik.com)**

An interactive experience rather than a project index — a single document built around my work and the direction my development is taking, driven by scroll, typography and motion.

Its production source is private. The examples below are drawn from it.

---

## Selected Work

| Project | Live |
|---|---|
| Vollmond Herrscher | https://vollmondherrscher.vercel.app/ |
| BiletUp | https://biletup.vercel.app/ |
| Blazing Energy | https://blazing-energy.vercel.app/ |
| ConverterTrue | https://convertertrue.vercel.app/ |
| SalesCore | https://salescore-platform.vercel.app/ |
| ATLAS | https://www.atlasstudio.com.tr/ |
| Finlight | https://finlightapp.vercel.app/ |
| Kalorici | https://kalorici.com/ |

More projects are available through my [GitHub profile](https://github.com/Bedirhanelcik).

---

## Technical Focus

Frontend development · Creative development · Interactive web experiences · Full-stack applications

Current technical interest is in AI engineering — generative AI, agentic systems, MCP and multi-agent workflows — built into products rather than kept separate from them.

---

## Stack

Verified against the portfolio this repository draws from.

| Area | Technologies |
|---|---|
| Framework | Next.js (App Router), React |
| Language | TypeScript |
| Styling | Tailwind CSS, CSS custom properties |
| Animation | GSAP — ScrollTrigger, Draggable |
| Scroll | Lenis |
| Testing | Vitest, Testing Library |

---

## Public Examples

Each file in [`examples/`](examples) is a simplified version of one pattern from the private implementation, with the framework wiring and project content stripped out and comments explaining the reasoning rather than the syntax. They are reference code, not components lifted out of the site.

**[`smooth-scroll.ts`](examples/smooth-scroll.ts)**

Lenis and GSAP ScrollTrigger driven from a single ticker, so scroll position and tween playheads are read in the same frame. Includes why GSAP's lag smoothing has to be disabled once scroll position is the animation input.

**[`pinned-reading-sweep.ts`](examples/pinned-reading-sweep.ts)**

A pinned paragraph that colours itself word by word under a scrubbed timeline, built as two staggered waves over one word list — the offset between them is the visible reading band, which keeps it to a single tuning value at any word count.

**[`theme-zones.ts`](examples/theme-zones.ts)**

Light and dark page zones flipped at declared scroll stops, each stop aware of the state before it so the sequence reads correctly in both directions. Also records why a scroll-scrubbed colour interpolation was rejected after it failed in the browser.

**[`hydration-safe-intro.ts`](examples/hydration-safe-intro.ts)**

An entrance animation on a server-rendered page without the flash of finished content: the start state is declared in CSS and armed before the markup is parsed, so first paint is frame zero rather than the final frame.

**[`looping-drag-track.ts`](examples/looping-drag-track.ts)**

A seamless looping gallery — measured step, wrapped offset, dragging through an off-DOM proxy so only one system owns the transform, and damping chosen by pointer type because a mouse drag and a touch swipe are not the same gesture.

---

## Engineering Approach

- **One frame loop.** Smooth scrolling and scroll-driven animation share a ticker instead of competing for the frame.
- **Scroll as a playhead.** Scrubbed and reversible where the reader should control the pace; triggered where an entrance should simply happen.
- **Reversible state.** Every transition knows the state it came from, so the page is correct however the reader moves through it.
- **Viewport-aware measurement.** Distances expressed in viewport units and re-measured on resize, not baked in at setup.
- **Hydration-safe initialisation.** Animation start states ship with the markup, and a test keeps the CSS and the timeline in agreement.
- **Reduced motion as a reader preference.** The entrance is skipped outright, so nothing animates out of a state that was never shown.
- **Controlled interaction state.** One owner per transform, explicit drag and click thresholds, and teardown for every loop, listener and trigger.

The longer version is in [`docs/architecture.md`](docs/architecture.md).

---

## Repository Structure

```
examples/   five isolated engineering examples
docs/       implementation notes
README.md
LICENSE
```

There is no build, no dependency manifest and no application here. The examples are meant to be read; they do not assemble into the portfolio.

---

## Contact

- Portfolio — [bedirhanelcik.com](https://bedirhanelcik.com)
- GitHub — [@Bedirhanelcik](https://github.com/Bedirhanelcik)
- LinkedIn — [bedirhanelcik](https://www.linkedin.com/in/bedirhanelcik/)
- Email — bedrhan.elck@outlook.com

Open to freelance frontend and interactive web work.

---

## License

All rights reserved. © 2026 Bedirhan Elçik

The code is public so it can be read and reviewed. That visibility is not a licence: copying, reuse, modification, redistribution, sublicensing and commercial use all need my permission first. The portfolio's artwork, branding, media, written content and production implementation stay proprietary, and nothing here grants rights to them.

Happy to discuss use — [get in touch](https://bedirhanelcik.com). Full terms in [LICENSE](LICENSE).
