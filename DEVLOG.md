# Dev log

## Current state

Single-file static page (`index.html`) renders all ring/wheel/hole combinations of a
Deluxe-style Spirograph set (2,820 patterns) in a virtualized grid with three.js. Filters for
rolling direction, fixed part, moving wheel and pen hole; shuffle. Verified via headless Chrome
screenshot.

Next steps / not done:
- Rack and non-circular pieces (oval, triangle) are not modelled; the rack needs an open-curve
  render, the shapes need a general rolling-contact simulation.
- `PARTS` tooth counts and hole layout are approximations (no official spec found online).
- Possible: click-to-detail, animated drawing, multi-pen layering, SVG/PNG export.

## Log

### 2026-11-07 — First version

Plan: one HTML file, three.js from a CDN import map, no build or server. One shared canvas
fixed behind the page; each visible tile gets a scissored viewport. Grid is virtualized by
row math, and Line2 geometries for off-screen tiles are disposed.

Decisions: tiles are fit to the curve's max radius so every pattern fills its tile. Used Line2
(not THREE.Line) so line width is not stuck at 1 device pixel. Hypo/epitrochoid with period
r/gcd(R,r) turns, and point count scales with the fast-angle cycle count.
Dead end: web search found no official tooth/hole table for the Deluxe set; used 2 rings
(96, 105) and 16 wheels (24–84) from memory and third-party sources.
