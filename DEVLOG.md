# Dev log

## Current state

Single-file static page (`index.html`) renders every ring/wheel/shape/pen-hole combination of a
Deluxe-style Spirograph set: rings 144/96 and 150/105, rack 150, 15 round wheels (24-84), and
the shaped wheels Eye (football), Bar (tube), Triangle, Cross. 7,196 combos enumerated, 6,595
physically valid. Filter chips show piece pictures; ink and paper colors are adjustable.
Verified by headless Chrome screenshots; the math core is tested under node (see below).

Next steps / not done:
- The Cross has zero physically valid combos in the simulation (its notches collide with any
  convex or flat partner); it only shows with "Include overlapping combos". Decide whether to
  keep, drop the check for it, or model how the real piece behaves.
- Bar/Eye/Triangle can't roll inside rings (no valid fit); they work around rings, the rack and
  other wheels. Real toy may be looser than the strict meshing model.
- Shaped-wheel tooth counts (Eye 64, Bar 64, Triangle 60, Cross 72) and hole positions are
  guesses; the rack's inner side is not modelled; the straight-rack-as-open-track is not either.
- Possible: click-to-detail, animated drawing, shareable URLs, SVG/PNG export.

Testing the core: extract the BEGIN/END CORE block of `index.html` into a `.mjs` with an
`export {...}` line and run it with node (analytic hypo/epitrochoid ranges matched; catalog
builds in ~200 ms).


## Log


### 2026-11-07 — Real parts, pictures, colors, per-tile canvases

Changes from first feedback: (1) labels overlapped the art and lagged it on scroll because one
fixed WebGL canvas was redrawn after DOM scrolling. Now each tile is a normal 2D canvas painted
from one offscreen three.js renderer (painted in a 10 ms/frame queue), with the label in a
footer below it. (2) Filter chips carry SVG pictures built from the outlines; tile footers show
the fixed part and the moving piece with its pen hole highlighted. (3) Ink swatches (auto by
wheel / presets / custom) and a paper color picker. (4) Parts now come from the SpiroGraphicArt
chart: rings 144/96, 150/105, rack, wheels (5-35 holes each, hole count ~ teeth/2 - 7) and the
Deluxe shaped wheels Eye, Bar, Triangle, Cross (the user's "football" and "tube" = Eye and Bar).

Design: general rolling-contact model. Every piece is a closed outline resampled to N teeth of
arc length; the roller's pose at travel s puts the matching contact points together with
tangents aligned (opposite directions outside, same inside). Pen path closes after
lcm(NF, NG) teeth. Pair validity = sample poses and test roller points against a signed distance
field of the fixed piece (inside rings: analytic circle). Checked against closed-form
hypo/epitrochoid ranges: exact.
Dead ends / findings: no source lists the shaped wheels' tooth counts; a pitch-curve model
rejects concave rollers (Cross) and flat/convex-sided shapes inside rings, so those combos are
hidden behind a toggle rather than dropped. Headless Chrome screenshots after scrollTo come out
blank (headless artifact, DOM dump confirms tiles are created/discarded correctly).

### 2026-11-07 — First version

Plan: one HTML file, three.js from a CDN import map, no build or server. One shared canvas
fixed behind the page; each visible tile gets a scissored viewport. Grid is virtualized by
row math, and Line2 geometries for off-screen tiles are disposed.

Decisions: tiles are fit to the curve's max radius so every pattern fills its tile. Used Line2
(not THREE.Line) so line width is not stuck at 1 device pixel. Hypo/epitrochoid with period
r/gcd(R,r) turns, and point count scales with the fast-angle cycle count.
Dead end: web search found no official tooth/hole table for the Deluxe set; used 2 rings
(96, 105) and 16 wheels (24–84) from memory and third-party sources.
