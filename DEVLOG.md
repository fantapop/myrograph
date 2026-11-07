# Dev log

## Current state

Single-file static page (`index.html`) renders every ring/wheel/shape/pen-hole combination of the
Deluxe set (from the user's photo `IMG_7377`): rings 144/96 and 150/105, rack 150, 15 round wheels
(24-84, 5-35 holes), and the shaped wheels Eye (13 holes), Bar (9), Triangle (12), Cross (10).
7,866 combos enumerated, 7,836 physically valid. Filter chips show piece pictures; ink and paper
colors are adjustable. Verified by headless Chrome screenshots; the math core is tested under node.

Next steps / not done:
- Only Bar inside rings 96/105 and Triangle inside ring 96 collide (hidden behind "Include
  overlapping combos"). In the photo the Bar has teeth only on its short ends; modelled with teeth
  all round, so Bar-in-ring is probably more permissive on the real toy.
- Shaped-wheel sizes and hole positions were measured by eye from the photo (+/-0.5 tooth); a
  closer photo of each would tighten them. Round-wheel hole distances are an even spread from
  0.8 to 0.14 of the tip radius (only distance matters for a round wheel).
- Rack is modelled with outside teeth only and aspect 7.8:1 (from the photo).
- Possible: click-to-detail, animated drawing, shareable URLs, SVG/PNG export.

Testing the core: extract the BEGIN/END CORE block of `index.html` into a `.mjs` with an
`export {...}` line and run it with node (analytic hypo/epitrochoid ranges matched; catalog
builds in ~250 ms).

## Log


### 2026-11-07 — Parts re-measured from the user's photo; Cross made to work

The Cross failed every collision check because its notches (and 0.5-tooth tip overshoot) hit the
partner. In the photo only the four curved arm ends are toothed and they lie on a circle, so the
Cross now rolls on a 60-tooth pitch circle (kinematics) while its real silhouette (curved ends,
big concave notches) is used for collision and pictures. Pieces now carry `o` (pitch outline)
and `body` (silhouette). Dead end: OpenCV Hough detection of holes was too noisy (digits,
spokes); counts were checked by eye instead (all 15 wheels match the chart), shape holes read
off an enlarged crop. Hole numbers per shape: Triangle has 12 not 10, Cross 10 not 9. Shapes
resized to the photo (Bar 8.6x13.8, Eye 23x16.6, Reuleaux triangle 16.9 wide, rack 7.8:1).
Gotcha: scaling an outline to an integer tooth count changes its size; compute the perimeter
first when the silhouette must stay 1:1 with the pitch curve.

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
