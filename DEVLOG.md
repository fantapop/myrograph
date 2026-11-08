# Dev log

## Current state

Single-file static page (`index.html`) renders every ring/wheel/shape/pen-hole combination of the
Deluxe set (from the user's photo `IMG_7377`): rings 144/96 and 150/105, rack 150, 15 round wheels
(24-84, 5-35 holes), and the shaped wheels Eye (13 holes), Bar (9), Triangle (12), Cross (10).
7,866 combos enumerated, 7,836 physically valid. Filter chips show piece pictures; ink and paper
colors are adjustable. Verified by headless Chrome screenshots; the math core is tested under node.

Compose feature: header "Compose" button (static label, no layer count) slides a panel in from the right. While open, grid
tiles are click-to-select (outline + check badge in the layer's color). The panel has a live
three.js overlay canvas (all layers share the centre), and a layer list with show/hide, color,
rotation, size (25-200%) and line width (0.5-6x) sliders and remove; "True size" keeps real relative sizes (tooth units), "Fit each"
normalises every layer. Selection is in-memory only (lost on reload).

Save/open: "Save PNG" renders the overlay offscreen at 1024/2048/4096 px and embeds the layer setup
(JSON, part ids + color/visible/rotation/size, paper color, base scale) in an iTXt chunk
"Myrograph" right after IHDR. "Open..." or dropping a PNG on the page restores it.
Round trip verified in headless Chrome (state identical) and the PNG still decodes in sips/Chrome.

Albums: the top-level Albums view (header tabs Patterns | Albums; thumbnails 220 px, count and date per item; the panel just has a "+ Album" button) keeps named collections of overlay setups in localStorage
(`myrograph.albums.v1`; ~0.5 KB per overlay, thumbnails re-rendered from the setup on demand, not
stored). Save-to-album, open, rename, replace-with-current, delete; export one/all albums as
`.myroalbum.json` and import them (names de-duplicated, fresh ids); importing/dropping a saved
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
(`myrograph.palettes.v1`, active one in `myrograph.palette.current`); presets/validation (`PRESET_PALETTES`,
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
`myrograph.parts.v1` (max 12). Custom combos are in `CUSTOM`, shown only through their own filter row (not the
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

### 2026-11-08 — A part that fits nothing cannot be saved

If the fit check finds no piece a part fits with (0 of 24 as the moving piece AND 0 of the wheels rolling around it, other custom parts
included), the part could never draw anything, so saving is refused. Two layers: (1) once the fit panel finishes (`ed.checked`),
`edSaveButtons()` disables Save and Save-as-copy with the reason as the tooltip, and the panel's summary says why; (2) `edSave`
itself calls `fitsSomething()`, which uses the finished result or, if the check has not run yet (Save clicked within ~0.2 s of an edit),
works it out on the spot, stopping at the first piece that fits. Applies when editing a saved part too. Parts already saved that fit
nothing are left alone.

### 2026-11-08 — "Surprise me" removed

The random-shape button mostly produced shapes that do not fit anything (in a test of 400 random hand-shaped parts, most were rejected by the ring check), so it
was removed. The Shape panel is now: Start from, Symmetry, Mirror.

### 2026-11-08 — Part maker: pitch-circle mode removed again, benefit audit

Prompted by "is it just the circle that drives the result?" (yes, verified): for a pitch-circle part the pen curve depends only on
the rolling circle (N), the fixed piece and the hole's DISTANCE from the centre. Different bodies gave identical curves (0.0000),
hole rotation gave the same curve (0.006-0.03 teeth of sampling noise), distance/N changed it. So the mode (added a few hours
earlier, see the previous entry, whose code is gone) only changed the look and where holes can sit, i.e. no new patterns: removed
(`git revert` of e88d3cf). `canonPart` now REFUSES `pc` parts (a stored/linked one is skipped, not drawn wrongly); the stored library
and 9-field share segments of that mode are dropped.
Tested and rejected, not built: the "middle option" (non-circular pitch curve + a separate body that stays clear of partners).
For each point of an oval's pitch curve, the worst it pokes out of the 96 ring over a whole roll: for ovals of 60+ teeth 0% of the
curve is safe (egg 76: 1%), so there is nowhere teeth could sit; where the shape does fit (oval 44: 82% safe) the plain shape
already fits. A body cannot fix a pitch curve that itself pokes through the partner.
Audit of what the maker offers vs what it buys (pen-curve difference from a circle of the same size, as % of the pattern's width):
egg 53, lens 26, oval 21, triangle 15, clover 11, pentagon 10, flower 8, rounded square 6, star 6. Removed: the presets within ~8%
(flower, star, rounded square: a circle with a wobble), the symmetry choices above 5-fold (the dips between lobes get sharper with
k squared; 6-8-fold tolerate only 3-6% lobe depth; a part made earlier with more still opens and shows its symmetry), the
"handles per section" control (presets pick a sensible count; the data field stays), the redundant "row along y" hole fill. Kept
on purpose: Mirror, Surprise me, grid / both-axes fill, rim-to-centre numbering, the fit grid, the preview and its scrub slider.

### 2026-11-08 — Pitch-circle custom parts

Why: the fit check showed that k-fold symmetry above ~4 only works for almost-circular parts (the dips between lobes get sharper
with k squared; 8-fold tolerates ~3% lobe depth), so the symmetry options were nearly useless. Answer: let a part work like the
real Cross. New part field `pc: 1` ("Rolls on a pitch circle" checkbox in the Shape panel): the rolling outline is a circle of N
teeth, the radial-handle outline becomes only the BODY, scaled so its tips touch the circle exactly (the one rule: nothing sticks out
past the circle), and teeth exist only where the body reaches within 0.6 tooth of it (`teethOn`). Because the body is inside the
pitch disk, such parts clear every ring and wheel (deep 4/6/8-fold stars: 24/24 tracks, 18/18 wheels; the same shapes without the
circle fit 0/24). Cost, stated plainly: a pen's curve depends only on the rolling circle and the hole distance, so a pitch-circle
part draws EXACTLY the curves of a round N-tooth wheel (tested, difference 5e-14). What it adds is hole placement anywhere in the
body (round wheels' holes stop short of the rim) and the look. Details: `makePitchPart` (CORE) builds circle + body (body.p rescaled
back to its true size after `makeOutline` rounds its tooth count); `pc` is in `canonPart` only when 1 and in the id only then, so
parts made earlier keep their ids; share segments get an optional 9th field `1`; holes are validated against `roller.body` (same
object as the outline for ordinary parts); the editor draws the pitch circle with a tick per tooth, the drag scale is fixed by the
largest radius instead of the perimeter; icons draw toothed arcs only where `teethOn` (`pcTeeth`); four presets (Cross, Trefoil,
6- and 8-point stars) switch the mode on; toggling it keeps the holes that are still inside the body.

### 2026-11-08 — Roll preview timeline (play/pause + scrub slider)

The maker's roll preview has a play/pause button and a slider (0-1000, step 5) above the picture. The slider follows the roll
while playing; dragging it pauses and jumps to that point of the pattern; Play on a finished roll replays it; at the end it
still shows the whole pattern for 0.4 s and restarts. State is `pvState = { playing, pos (0-1), hold }`, kept across preview
rebuilds so editing the shape, partner or pen hole while paused keeps your place; a new editor session resets it. While paused
nothing is redrawn (frame only draws when the point index changes). Bug found with a fake clock: each loop only checked that *a*
preview existed, so a stale loop could keep running and double the speed; each loop now retires itself when it is no longer
the current preview (`pv !== mine`). Test hooks: `__myro.parts.pv()` / `.pvState()`.

### 2026-11-08 — Roll preview restart pause

The maker's roll preview held the finished pattern for 60 *frames* before restarting: ~1 s at 60 fps but proportionally longer
whenever frames were slow (each frame redraws up to 20,000 path points), reported as a lag of a couple of seconds. It is now timed
with `performance.now` (`PV_DRAW` = 7 s to draw, `PV_PAUSE` = 0.4 s before restart). Verified with a fake clock: pause 0.40 s at
60 fps and 0.42 s at 12 fps (would have been 5 s). Test hook: `__myro.parts.pv()`.

### 2026-11-08 — Stricter collision check for custom parts; denser pen paths

Report: in the part maker an oval "escaped" the ring and the pen line looked disconnected, worse for complicated parts. Two
separate causes, measured before changing anything:
1. Collision (`fits`): tolerance 0.4 tooth, only 48 outline points, poses every 1.5 teeth, one-sided (the moving outline against
   the fixed piece only), and the fixed piece's distance field used one polygon vertex per tooth. Against a brute-force ground
   truth (exact polygon distances both ways, a pose every 0.5 tooth) the old check accepted 7 of 39 gentle random shapes that really
   overlapped their partner (up to 0.39 tooth; ovals of 44-48 teeth and eggs of 54-66 overlapped the 96 ring by 0.1-0.4).
   Pairs involving a custom part now use a strict mode (`pairFits` -> `fits(..., hi)`): tolerance 0.05 vs a ring (exact) / 0.1 vs
   another piece (grid error), a pose every 0.5 tooth (<= 24000), up to 160 outline points, BOTH directions (the fixed outline is
   tested against the moving piece's own distance field in its frame), full-resolution distance fields for custom outlines (cell
   shrinks for small pieces). Result on the same sample: 0 accepted overlaps, 0 wrongly rejected clear pairs. The regular catalog
   (Eye/Bar/Triangle/Cross, estimated geometry) deliberately keeps the old check, so the gallery's 7,836 patterns did not change.
2. The broken-looking line was the pen path itself: it was sampled every 1/4 tooth of CONTACT travel, but a pen far from the
   piece's centre sweeps much faster (steps of 1.2-1.7 teeth = straight chords and hooked cusps; the path is mathematically
   continuous, closing gap 0). `traceRaw` now adds points wherever the pen moved more than 0.15 tooth (largest step now 0.147),
   within the point cap, and returns `ss` (travel per point) so the maker preview draws the moving piece where the pen is.
Side effects handled: presets that only worked because of the loose check were rounded off again (triangle 4 -> 17 of 24 tracks,
pentagon, flower, star, square, clover now fit 17-24); the strict check costs 0.2-0.9 s per part, which broke startup for a full
library (12 parts: 4.6 s), so fit results are remembered: seeded from the fit panel at save time and persisted under
`myrograph.fits.v2` (ids are content hashes, results never go stale; bump .v2 if the check changes): 12 parts load in 7 ms.
Also fixed: a stale dialog `close` event could clear a freshly opened editor (queued event; now ignored if the dialog is open).
First load after this change recomputes any existing library once (up to a few seconds for a big library).

### 2026-11-08 — Part maker size range 7-300 teeth

Was 24-110 (24 is just the real set's smallest wheel). New range 7-300 (`PART_LIMITS.Nmin/Nmax`, also drives the slider).
Minimum: a pen hole must stay HOLE_MARGIN (1 tooth) inside the edge, a circle of N teeth has radius N/2pi, so the smallest circle
that can hold one hole has N = 7 (radius 1.11; 6 gives 0.95); other shapes need more (a thin oval at 7 cannot be saved). Maximum
300 = twice the largest ring, generous. What had to change for this: (1) `fits()` sampled `S = 48` body points with
`stride = floor(M/48)`, which is 0 below 12 teeth (every sample = point 0); S is now `min(48, M)`. (2) Fixed-piece distance
fields were rebuilt for every partner; they are now cached per piece object (`SDF_CACHE` WeakMap), so a 300-tooth fixed piece
checks against every wheel in ~50 ms instead of ~600 ms (400 teeth was 1.3 s). (3) Icons used one outline point per tooth, which
makes a 7-tooth wheel a heptagon; pieces under 48 teeth now use all points. (4) The teeth band height is capped at 20% of the
radius (it was bigger than a 7-tooth wheel itself). Verified a 7-, 9-, 12-, 16-tooth circle and a 300-tooth oval save and render.

### 2026-11-08 — Ring labels, per-pattern Auto ink, rename of the saved-data names

- Ring chips: a ring has two sets of teeth (96 inner / 144 outer on one ring, 105 inner / 150 outer on the other), so the four
  Fixed-part chips are now labelled by ring and side: "Ring 96/144 inside (96)", "... outside (144)", etc. Track names became
  "Ring 96/144" (footers show "· inside/outside" after it). There is no "150 inner": 150 is the outer edge of the 105 ring.
- Relative sizes verified, not changed: every wheel is within 0.1% of N/pi at one px-per-tooth scale in both rows (84 wheel =
  48.7 px, 24 wheel = 13.9 px), the 144 and 150 rings differ by 4% and many neighbouring wheels by 5-7%, so they look alike
  because the real parts are.
- Auto ink: after layers started taking their tile's color, Auto (one color per moving piece) made every layer from the same
  wheel identical. Auto is now one palette color per *pattern* (`patternSeed(p) % palette.length`, catalog order, so successive
  holes of a wheel differ, stable under filtering; string-keyed custom patterns are hashed). Tile color still equals layer color.
- Rename: nothing is written under the old names any more: app id `myrograph`, PNG chunk `Myrograph`, storage keys `myrograph.*`,
  album files `.myroalbum.json` / `myrograph-albums`, test hook `window.__myro`, error text. The old names live only in `LEGACY`
  (index.html, UI section) and are READ-only: `isApp()` accepts the old app id, `readSetup()` tries the old PNG chunk name, and
  `migrateLegacyStorage()` moves old browser data (albums, palettes, parts, current choices) to the new keys once and deletes the
  old ones and two dead settings. Saved setups are re-tagged with the new app id (`modern()`) on load/import/export. Delete
  `LEGACY` and its three users when old data no longer matters. Tested: seeded old-style localStorage, old PNG, old album file.


### 2026-11-08 — Holes on fixed pieces; Cross teeth only on the arm ends

Fixed pieces now draw their pen holes like their moving twins: the `fix-*` catalog tracks carry `holes` (same array as the
roller), and a custom part's re-centred fixed copy shifts its holes by the same centroid (`recentredHoles`; node-tested).
The rack has no holes (`holePoints` returns []; forgetting that crashed the whole Fixed row while building, caught before
pushing). The Cross's teeth go only on the four arm ends, on the 60-tooth pitch circle it rolls on, not in the notches:
`crossTeeth()` draws four short toothed arcs of radius 1 (the icon is normalised to the Cross's largest radius, which is that
circle), spanning +/- asin(hw/Rt) around each axis, ~5.5 teeth per arm (`CROSS_ARM` constants shared with `crossBodyDense`).

### 2026-11-08 — One scale for the Fixed and Moving rows

Each row used to be scaled so its own largest piece filled the icon (the 150 ring for Fixed, the 84 wheel for Moving), so the same
wheel was drawn bigger in the Moving row than in the Fixed row. Now both rows share one reference radius (the largest moving piece,
13.4 teeth, fills the standard 56 px box) and the Fixed row's icon boxes are taller (`box` = largest ring / ref + .15, ~94 px) so
the rings fit at that same scale; the rack gets a wider box. Every piece in both rows is therefore drawn at the same px per tooth
(measured: wheel 60 = 34.8 px in both rows). Row labels now centre on the first line using the measured chip height
(`applyCollapse` sets the label's min-height) instead of a fixed 82 px, since the two rows have different heights. Trade-off: the
Fixed row is taller and fits fewer chips per line (9 collapsed at 1300 px).

### 2026-11-08 — Overlapping combos removed; teeth and holes in the piece pictures

1. Dropped the "Include overlapping combos" chip: combos whose pieces would collide (`p.ok` false) are never listed, and the
count no longer mentions them ("7,836 of 7,836 patterns"). `ok` is still computed (the part maker shows red/green from it);
the "overlaps" tag in the tile footer is gone (it could no longer appear).
2. Piece pictures (chips, tile footers, layer rows, maker grid) now show teeth and holes. Teeth are a dashed band along the
pitch outline with `pathLength = N` and `stroke-dasharray=".5 .5"`, so any shape gets exactly N teeth for free (`teeth()`);
rings get teeth on both the inner and outer edge. Below ~2 px per tooth neighbouring teeth are merged (`m`) so the texture
stays visible: the picture is an illustration, the tooth count is on the chip. The Cross has no teeth ring (its teeth are only
on the arm ends, its outline is the silhouette). Pen holes were already drawn but round wheels' holes sit on a line at
0.3-tooth spacing and merged into a bar; round wheels' holes are now displayed along a spiral (`holePoints`, 0.7 rad per hole,
like the real wheels; only a round wheel's hole distance matters for the pattern, so this is cosmetic and the highlighted
hole is just as valid). Shaped wheels and custom parts show their real hole positions.

### 2026-11-08 — Rack icon uncropped; ring icons show a small wheel

Rack: it is 35 teeth from centre to end, more than the row's reference radius (the 150 ring, 23.9), so at true scale it was
1.46x wider than its square icon and the curved ends were cropped away (two bare lines). Icons now accept a wider viewBox
(`svg(body, hw)`; `trackIcon` widens it when `s + .15 > 1.15`, i.e. only the rack) so it is drawn whole, at true scale, in a
wider chip. Rings: dropped the orange outline on "the circle it rolls on"; instead a small wheel circle is drawn where it
would sit: inside the opening (touching the inner edge) for inner tracks, against the outer edge for outer tracks, at 45
degrees up-right so it stays inside the icon box. Applies everywhere `trackIcon` is used (chips, tile footers, layer rows,
maker compat grid).

### 2026-11-08 — "+N more" pills line up

The pills followed the last visible chip, so each row's sat at a different x. `.rowtoggle` now has `margin-left: auto` (pushed to
the end of its line, i.e. the row's right edge) and a fixed 84 px width with centred text, so all rows' pills share both
edges. The collapse measuring is unchanged (the pill still has to fit on the first line, so about one chip fewer fits).

### 2026-11-08 — Pen hole row collapses too

The Pen hole row (35 chips, wraps to two lines) uses the same one-line "＋N more" collapse as the piece rows (always starts
collapsed). Collapsing now hides chips with a `.fold` class instead of the `hidden` attribute, because the pen hole chips
already use `hidden` for "no matching piece has this hole" (`syncHoleChips`); `applyCollapse` measures only the non-`hidden`
chips, so the two mechanisms stay independent (and `syncHoleChips` iterates `.chip`, since the pill is now a child of the row).

### 2026-11-08 — Rows always start collapsed

The expand/collapse state of the Fixed part / Moving piece rows was persisted (`spirograph.rows`), so anyone who had
expanded a row once (including under the earlier "selected only" design, which defaulted to expanded) landed on an
expanded page. It is now in-memory only: every visit starts collapsed to one line, expanding lasts for the visit. The old
`spirograph.rows` key is ignored.

### 2026-11-08 — Row labels on the first line; to-scale is the only mode

Row labels were vertically centred on the whole row, which looked wrong once rows wrapped or expanded. They are now
`align-self: flex-start` with a min-height equal to the first line (24 px normally, 82 px for the `.row.big` picture rows),
so each label is centred on its first line of chips. Removed the "Relative sizes" toggle (and `relSizes`, `SIZE_KEY`, the
function-valued chip html): the Fixed part / Moving piece pictures are always drawn to scale. The stale
`spirograph.relsize` localStorage key is simply ignored. `trackIcon`/`rollerIcon` keep their optional `ref` because the
tile footers, layer rows and custom chips still use the normalised form.

### 2026-11-08 — Rows collapse to one line with a "+N more" pill

Feedback: the "collapse / show all N" text button looked bad. Replaced by measuring: `applyCollapse(id)` shows the chips
that fit on the first line, keeps selected chips visible even beyond it, and puts a dashed "＋N more" pill right after the
last visible chip (found by backing off from the first-line count until the pill itself sits on line 1); expanded rows end
with "▴ fewer". No pill when everything already fits. Default is collapsed (`spirograph.rows`), re-measured on resize,
compose open/close, view change and the Relative sizes toggle (via `fitHeader`). Supersedes the "selected only" collapse
from the entry above (and its "any (none selected)" hint, which is gone).

### 2026-11-08 — Bigger to-scale chips, collapsible rows, unpinned tall header

Feedback: the to-scale pictures were too small (a 24 wheel next to a 150 ring is ~16%). In to-scale mode the Fixed part
and Moving piece chips are now 56 px pictures with the label underneath (`.chips.rel`). That made the filter header ~590 px,
so: (1) each of the two rows has a "collapse / show all N" toggle (`rowToggle`, state in `spirograph.rows`) that shows only
the selected chips (with an "any (none selected)" hint); (2) `fitHeader()` un-pins the header (`header.tall` -> static)
when its content is taller than half the window, so it scrolls away instead of covering the grid (re-checked on resize,
view change, toggles, refilter); collapsing the rows brings back the compact sticky header. Considered horizontal-scroll
single-line rows; rejected as hard to discover.

### 2026-11-08 — Relative sizes in the filter chips

Every piece picture used to fill its icon, so a 24 wheel looked as big as the 150 ring. The Fixed part and Moving piece
chips are now drawn to scale: `trackIcon(t, ref)` / `rollerIcon(r, hole, ref)` take a reference radius in teeth (largest
piece of the row, rack excluded so it is cropped instead of shrinking everything) and scale the geometry while keeping
line weight and hole-dot size (`scaled()`). A "Relative sizes" chip in the Rolling row toggles it (default on, remembered
under `spirograph.relsize`); chip tooltips now give teeth and hole counts. Deliberately not applied to the tile footers and
layer rows (they highlight the pen hole, which would vanish at 20% scale) or the Custom parts chips (a custom piece may
exceed the set's largest radius, which would crop it or rescale everyone else).

### 2026-11-08 — Pen hole chips follow the other filters

The pen hole chips used to always show 1-35. Now `refilter` first applies every other filter (rolling mode, fixed part,
moving piece, overlap toggle, custom-parts pool), collects which hole numbers exist among those patterns
(`syncHoleChips`), and hides the rest; a selected hole that becomes unavailable is dropped from the filter so a hidden
chip can never silently empty the grid. Chosen over "just look at the selected moving piece" because it also handles
the Custom parts row and the overlap setting for free. Not done (symmetry): hiding moving pieces that have fewer holes
than a selected hole number.

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
