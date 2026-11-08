# Dev log

## Current state

Single-file static page (`index.html`) renders every ring/wheel/shape/pen-hole combination of the
Deluxe set (from the user's photo `IMG_7377`): rings 144/96 and 150/105, rack 150, 15 round wheels
(24-84, 5-35 holes), and the shaped wheels Eye (13 holes), Bar (9), Triangle (12), Cross (10).
7,866 combos enumerated, 7,836 physically valid. Filter chips show piece pictures; ink and paper
colors are adjustable. Verified by headless Chrome screenshots; the math core is tested under node.

Compose feature: header "Compose (n)" button slides a panel in from the right. While open, grid
tiles are click-to-select (outline + check badge in the layer's color). The panel has a live
three.js overlay canvas (all layers share the centre), and a layer list with show/hide, color,
rotation + size sliders (25-200%) and remove; "True size" keeps real relative sizes (tooth units), "Fit each"
normalises every layer. Selection is in-memory only (lost on reload).

Save/open: "Save PNG" renders the overlay offscreen at 1024/2048/4096 px and embeds the layer setup
(JSON, part ids + color/visible/rotation/size, paper color, base scale) in an iTXt chunk
"SpirographGallery" right after IHDR. "Open..." or dropping a PNG on the page restores it.
Round trip verified in headless Chrome (state identical) and the PNG still decodes in sips/Chrome.

Albums: the top-level Albums view (header tabs Patterns | Albums; thumbnails 220 px, count and date per item; the panel just has a "+ Album" button) keeps named collections of overlay setups in localStorage
(`spirograph.albums.v1`; ~0.5 KB per overlay, thumbnails re-rendered from the setup on demand, not
stored). Save-to-album, open, rename, replace-with-current, delete; export one/all albums as
`.spiroalbum.json` and import them (names de-duplicated, fresh ids); importing/dropping a saved
PNG adds its embedded setup to the current album. Verified in headless Chrome.

Share links: "Copy link" in the panel (and a link button on each album item) copies
`<page url>#v1/<paper>/<t|f>/<track,roller,hole,color,visible,rot,size>/...` (~35 chars/layer, in
the fragment so no server sees it). Opening such a URL (or pasting one and triggering
`hashchange`, which confirms before replacing) restores the overlay in the Compose panel; bad or
unknown parts are rejected/skipped with a message. `encodeShare`/`decodeShare` are in CORE and
node-tested; the URL is not updated live while editing (button only).

Ink palettes: the Ink row has a palette dropdown (9 presets - Classic is the original colors - plus "My palettes"),
Edit... (a preset is copied first; own palettes edited in place, with delete) and + New. The active palette
drives the grid's Auto ink (one color per moving piece, cycling) and the color of each newly added Compose
layer (first palette color not already used). Custom palettes live in localStorage
(`spirograph.palettes.v1`, active one in `spirograph.palette.current`); presets/validation (`PRESET_PALETTES`,
`cleanPalette`, `parsePalettes`) are in CORE and node-tested. Choosing a palette does not recolor layers
already in the overlay. A palette can carry an optional `paper` (Neon, Midnight, Chalkboard, or a custom one via
the editor's "Paper" checkbox): choosing it sets the paper; choosing a palette without one restores the default
light paper only if the previous palette set it (`paperFromPalette`), so a hand-picked paper is never overridden.

Next steps / not done:
- Palettes: no export/import (browser-local only, like albums), no reordering colors. Paper isn't persisted
  across reloads; it is re-applied from the saved palette on load, so a hand-picked paper is lost on reload.
- Share links are only useful when the page is hosted; a file:// link works only on the same
  computer (the copy message says so). No deployment set up yet (e.g. GitHub Pages).
- Albums live per browser profile and per origin (file:// vs http://localhost are separate
  stores) - export is the backup path. No drag-reorder of items, no multi-select.
- Compose: no SVG export, no layer reordering, no per-layer
  offset (all share one centre), no per-layer line width.
- Only Bar inside rings 96/105 and Triangle inside ring 96 collide (hidden behind "Include
  overlapping combos"). In the photo the Bar has teeth only on its short ends; modelled with teeth
  all round, so Bar-in-ring is probably more permissive on the real toy.
- Shaped-wheel sizes and hole positions were measured by eye from the photo (+/-0.5 tooth); a
  closer photo of each would tighten them. Round-wheel hole distances are an even spread from
  0.8 to 0.14 of the tip radius (only distance matters for a round wheel).
- Rack is modelled with outside teeth only and aspect 7.8:1 (from the photo).
- Possible: click-to-detail, animated drawing, shareable URLs, SVG/PNG export.

Testing: `node tools/test.mjs` extracts the CORE block and checks the rolling math against closed
forms, catalog hole counts, PNG chunks and share links. `tools/shot.sh` takes headless screenshots.
`CLAUDE.md` is the short orientation file for a fresh session.

## Log

### 2026-11-07 — Dark-paper palettes

Feedback: Neon needed a manual dark paper. Palettes now have an optional `paper`; added Midnight and Chalkboard
and renamed Neon (dropped "(dark paper)"). Considered always forcing paper on every palette switch - rejected
because it would clobber a hand-picked paper. Verified in headless Chrome (neon/ocean/chalk/manual cases).

### 2026-11-07 — Color palettes

Request: keep the original palette and per-pattern color picking, but add preset palettes and a custom palette
that persists. Decision: one concept - a palette is an ordered color list - used by both Auto ink and new
layers, instead of separate ink/layer lists (Classic = the old layer list of 8, so Auto ink now cycles 8 colors
instead of 6; hues are the same). Save-only editor (no live preview) to keep it simple; localStorage over file
export since albums already set that precedent. Verified in headless Chrome: select preset, copy+edit+save,
persisted JSON, new layers take the palette's colors; sanitizing tested in node.


### 2026-11-07 — Handoff prep

Added `CLAUDE.md` (orientation, gotchas) and `tools/` (test.mjs, shot.sh) so a new session does
not depend on scratch scripts that used to live in the old workspace's git-ignored `.context/`.
History was rewritten once before this to drop the old `misc` root commit (it carried a work
email); the new repo has only noreply-authored commits.

### 2026-11-07 — Named myrograph, moved to its own repo

Moved out of the shared `misc` repo into `fantapop/myrograph` (history pushed as `main`). Chose
the name myrograph over using "Spirograph" (a registered trademark; risk judged low for a free
hobby project, rename if a takedown arrives). Visible strings (title, README, download names,
messages) say myrograph; internal identifiers keep "spirograph" so old PNGs, album files, share
links and localStorage keep working - if renaming them later, keep reading the old names. The
reference photo of the set stays out of the repo (packaging artwork).

### 2026-11-07 — Share via URL

Chose a readable fragment format over base64/deflate: layers are short ids and numbers, ~110
chars for 3 layers, so compression would add async code for little gain. Fragment (not query)
so the data never reaches a server and the page needs no routing. Decoder validates every field
(hex colors, id charset, clamped rot/size) before anything touches the app.

### 2026-11-07 — Panel shows which album it adds to

The Compose panel's "+ Album" gave no hint of its target. Now there is an Album dropdown beside a
button labelled "+ Add to \"<album>\"" (name truncated), plus a "+ New album..." entry; the
selection is shared with the Albums view (`fillAlbumSelects`). With no albums yet the dropdown
says one called "My album" will be created on first add, and the confirmation message names the
album.

### 2026-11-07 — Albums promoted to a top-level view

Feedback: albums were buried in the editor panel. Now header nav switches the main area between
the Patterns grid and an Albums view; the Compose panel can stay open beside either. Opening an
item loads it into the panel. Switching views remembers each view's scroll position; the grid is
kept in the DOM while hidden and re-flowed only if the width changed meanwhile (`gridStale`;
`relayout`/`sync` no-op while the grid is hidden).

### 2026-11-07 — Albums

Decision: store the same small setup object used for PNG metadata (no images), so one format
serves PNG, albums and export. localStorage is plenty (5 MB ~ thousands of overlays); IndexedDB
not needed. Refactored overlay drawing into `makeLines(layers, trueSize, width, res, curve)` shared
by the live canvas, PNG export and album thumbnails; thumbnails reuse the grid's offscreen
renderer (resized then restored) and are rendered in an 8 ms/frame queue. Cross-tab `storage`
events refresh the list. Prompt/confirm are used for rename/delete (not exercised headless).

### 2026-11-07 — PNG save with embedded setup

Chunk helpers (crc32, addTextChunk, readTextChunk) live in the CORE block and are tested under
node (crc32 check value, roundtrip incl. non-ASCII). Layers are stored by `track|roller|hole` ids
rather than ALL indices so files survive PARTS edits (parts that no longer exist are skipped and
reported). Metadata is plain iTXt (uncompressed JSON); image viewers ignore it, but re-saving
through tools that strip text chunks (many web uploaders, screenshots) loses the setup.
`window.__spiro` exposes makePng/openFile/etc. for headless testing.

### 2026-11-07 — Overlay composer

Plan/outcome: right-hand drawer with its own WebGL renderer (the grid keeps using the offscreen
one). Raw (unnormalised) curves are cached per pattern (`traceRaw`) so colour/rotation/scale
changes only re-render; geometry is shared, each layer gets its own Line2 with a uniform
scale (line width stays in screen pixels). Opening the drawer narrows the grid and re-flows it
while keeping the first visible row in place (`relayout`). Pattern identity is `p.key` = index in
ALL, stable as long as PARTS is unchanged.

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
