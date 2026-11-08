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
rotation, size (25-200%) and line width (0.5-6x) sliders and remove; "True size" keeps real relative sizes (tooth units), "Fit each"
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

Custom parts: the Custom parts filter row ("＋ Make a part…", chips with a ✎ edit button per part) opens a maker
dialog. Shape = star-shaped outline from radial handles (k-fold symmetry x n handles per section, optional mirror,
periodic cubic spline) or a preset (circle, oval, lens, egg, rounded square/triangle, pentagon, flower, clover,
star); Size = tooth count N (perimeter scaled to exactly N). Pen holes: click/drag/right-click, row/grid fill,
margin 1 tooth from the edge enforced. Live "fits with the set" grid (green/red from the same `fits` simulation,
computed incrementally so the UI stays responsive) and an animated roll preview. Library: localStorage
`spirograph.parts.v1` (max 12). Custom combos are in `CUSTOM`, shown only through their own filter row (not the
main grid). Parts are immutable and content-addressed (`c` + hash), and PNG/album/share-link state carries the
definitions (`parts`; `p,...` URL segments, ~150 chars for 2 layers + 1 part), so others can open them; a
"keep part" button in the layer list adds a guest part to the library. Tested in node (CORE) and in headless
Chrome (editor interaction, save/edit/copy/delete, reload persistence, link/PNG/album round trips).

Next steps / not done:
- Custom parts: no custom rings/racks (inside tracks must be circles); no undo in the maker; no library-only
  export (albums/PNGs carry parts); hole numbers are in placement order unless "Number rim -> centre"; only
  non-overlap is modelled, not whether real teeth would mesh (same as the shaped wheels).
- Palettes: no export/import (browser-local only, like albums), no reordering colors. Paper isn't persisted
  across reloads; it is re-applied from the saved palette on load, so a hand-picked paper is lost on reload.
- Share links only work for others when copied from the hosted page (GitHub Pages, below); a file:// or
  localhost link works only on the same computer (the copy message says so).
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

### 2026-11-08 — White / Black paper buttons

Paper row now has round White (#ffffff) and Black (#000000) swatches plus the free color picker (the active swatch gets
an accent ring; the default off-white #faf7f0 matches neither). The free pickers (paper and ink) are drawn as a rainbow ring with a dot of the current custom color (`.pick`, `--pc`) with the real `<input type=color>` invisibly on top; styling the native swatch itself did not work (Chrome paints the chosen color over any background). Choosing one counts as a hand-picked paper. Also fixed:
a palette that sets its own paper (Neon, Midnight, Chalkboard) now remembers the paper you had (`paperBeforePalette`)
and restores that, not the default, when you leave it.

### 2026-11-08 — Print the overlay

Print button in the Compose panel plus the normal print shortcut. `beforeprint` (only when the panel is open and a layer
is visible) renders the overlay at 2400 px with a throwaway WebGL renderer, copies it synchronously into `#print-c`
(a plain canvas; the live WebGL canvas can print blank) and adds `body.print-overlay`, which `@media print` uses to hide
everything but `#print-sheet`; `afterprint` undoes it. Otherwise Ctrl/Cmd+P prints the page as before, so the shortcut
is not hijacked while just browsing. Prints in the paper color (WYSIWYG), so a dark paper prints dark; use Save PNG or
change the paper for ink-saving. Verified via Chrome's print-to-PDF (one page, overlay only, centered). Dead end: an
`<img>` with a data URL in `beforeprint` (decode is async, may not be ready when printing starts).

### 2026-11-08 — Per-layer line width; layer colors match the grid

Feedback: wanted line width per layer in the Compose canvas, and the color of a selected tile on the left should
be the color used on the canvas (new layers used the next unused palette color, so they rarely matched the tile).
Now: each layer has `width` (multiplier of the base 1.6 px line, 0.5-6x, slider "Line"); saved in PNG/album
state and share links (optional 8th field, tenths, omitted at 1.0x so old links and short links are unchanged;
decoder defaults to 1x). New layers take `inkFor(p)`, exactly what the tile is drawn with (Auto = palette color of
the moving piece, or the fixed ink swatch). Selected tiles are drawn in their layer's color (`tileColor`), so
recoloring a layer or changing the ink afterwards cannot make the left side disagree with the canvas.
Trade-off: layers from the same moving piece (e.g. several holes of wheel 30) now start with the same color, where
before each got a fresh palette color; recolor them in the layer row.

### 2026-11-07 — Custom part maker

Plan (user: exploring on screen, custom parts in their own filter, no custom rings, sharing is the tricky part):
shape editor + live fit feedback + preview, parts embedded in everything that is shared. Outcome: shipped as
described in Current state. Decisions and why:
- Radial-handle model (star-shaped about the origin) instead of free polygons: always a simple closed curve,
  symmetric by construction, tiny to store/share (n radii as bytes), easy to drag. It cannot make re-entrant
  shapes (a spiral, a crescent); that was accepted.
- Size is the tooth count: the outline is scaled so its perimeter is N. That is what "fits the set" means here
  (same tooth pitch); the real check is the existing `fits` collision simulation, shown live as green/red chips.
- Content-addressed ids (hash of N, k, n, mirror, radii, holes; not the name). Editing makes a new part, so old
  PNGs/albums/links can never silently change, and dedupe across devices is free. Cost: parts that arrive via a
  file/link are "guest" parts (in `registry`, rendered via `guest()` in `lookup`, not in the library).
- Rollers are NOT re-centred (origin = handle centre, so hole coordinates stay put while dragging); the fixed
  version of the part IS re-centred (else its pattern is off-centre in the tile).
- Custom combos get string keys (`track|roller|hole`) instead of ALL indices, so layers survive library edits.
- Part names go into innerHTML in several places, so `cleanName` strips everything but letters/digits/space/_.,()+-
  at the CORE boundary (applies to shared links too).
Dead ends: deep-lobed presets (flower/clover/star at amplitude .3-.5, and the Cross) fit nothing: lobes poke into
any circular partner. Measured fit counts vs amplitude and kept the presets shallow (~.06-.14); the maker says so
when few pieces fit. Cross preset dropped (the real Cross needs a pitch circle trick, see the earlier entry).
Test hooks: `window.__spiro.parts` (open/ed/library/registry/forget...) for headless driving; pointer events can be
dispatched on `#pm-c` (setPointerCapture is wrapped in try/catch for synthetic pointers).

### 2026-11-07 — Public, MIT, GitHub Pages

Repo made public after auditing history (all commits use the noreply identity; Conductor's `checkpointer@noreply`
commits exist only on local `refs/conductor-checkpoints/*`, never pushed) and adding an MIT `LICENSE`. GitHub Pages
enabled via `gh api -X POST repos/fantapop/myrograph/pages` (branch main, path /); site is
https://fantapop.github.io/myrograph/ and redeploys on each push to main. The copy-link note now warns on localhost too.
Next planned feature: custom shaped part maker (own filter, no custom rings; sharing needs part definitions embedded in
PNGs/exports and a decision on whether URL links can carry one).

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
