# Dev log

## Current state

Single-file static page (`index.html`) renders every ring/wheel/shape/pen-hole combination of the
Deluxe set (from the user's photo `IMG_7377`): rings 144/96 and 150/105, rack 150, 15 round wheels
(24-84, 5-35 holes), and the shaped wheels Eye (13 holes), Bar (9), Triangle (12), Cross (10).
7,866 combos enumerated, 7,836 physically valid. Filter chips show piece pictures; ink and paper
colors are adjustable. Verified by headless Chrome screenshots; the math core is tested under node.

Compose feature: header "Compose" button (static label, no layer count) slides a panel in from the right. While open, grid
tiles are click-to-select (outline + check badge in the layer's color). The panel has a live
three.js overlay canvas (all layers share the center), and a layer list with show/hide, color,
rotation, size (10-500%, a logarithmic slider) and line width (0.5-20x, a logarithmic slider) sliders and remove; layers keep their real sizes relative to each other (the largest visible layer fills the picture); each layer's Size scales it. Selection is in-memory only (lost on reload).

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
  export (albums/PNGs carry parts); hole numbers are in placement order unless "Number rim -> center"; only
  non-overlap is modeled, not whether real teeth would mesh (same as the shaped wheels).
- Palettes: no export/import (browser-local only, like albums), no reordering colors. Paper isn't persisted
  across reloads; it is re-applied from the saved palette on load, so a hand-picked paper is lost on reload.
- Share links only work for others when copied from the hosted page (GitHub Pages, below); a file:// or
  localhost link works only on the same computer (the copy message says so).
- Albums live per browser profile and per origin (file:// vs http://localhost are separate
  stores) - export is the backup path. No drag-reorder of items, no multi-select.
- Compose: no SVG export, no layer reordering; animation is GIF only (see the 2026-11-08 animation entry).
- Only Bar inside rings 96/105 and Triangle inside ring 96 collide (hidden behind "Include
  overlapping combos"). In the photo the Bar has teeth only on its short ends; modeled with teeth
  all round, so Bar-in-ring is probably more permissive on the real toy.
- Shaped-wheel sizes and hole positions were measured by eye from the photo (+/-0.5 tooth); a
  closer photo of each would tighten them. Round-wheel hole distances are an even spread from
  0.8 to 0.14 of the tip radius (only distance matters for a round wheel).
- Rack is modeled with outside teeth only and aspect 7.8:1 (from the photo).
- Possible: click-to-detail, animated drawing, shareable URLs, SVG/PNG export.

Testing: `node tools/test.mjs` extracts the CORE block and checks the rolling math against closed
forms, catalog hole counts, PNG chunks and share links. `tools/shot.sh` takes headless screenshots.
`CLAUDE.md` is the short orientation file for a fresh session.

## Log

### 2026-11-09 — Automatic background sync (scheduler), still without a cloud

- Feedback: nobody should have to remember to sync. The scheduler is built now and only needs a provider: `syncEnable(provider)` -> an immediate first run; then **every store write kicks a debounced run** (3 s, so a burst of edits is one sync), **returning to the tab**
  (pulls other devices' work; at least 15 s since the last run), **the tab being hidden** (pushes what is waiting right away: best effort), **the connection coming back**, and a **slow poll** (2 min) while the tab is visible. Runs never overlap (a change made mid-run
  schedules another), are skipped while offline or while the part maker is open and resume by themselves, and **retry with a growing delay** (5 s, 15 s, 1 min, 5 min) on failures. A provider error marked `.auth` stops the retries and shows "Sign in again".
- There is no queue to lose: edits are found by hashing at the next run, so something changed offline, or just before closing the tab, is simply picked up at the next run (a closed tab can't sync; the next open does, first thing).
- Status: a small dot on the cloud button (green connected, pulsing while syncing, amber waiting / offline, red problem) and a line in the Backup & sync dialog ("Up to date (synced 2 min ago)", "Offline: changes will sync when you are back online", "Sync problem: ... your work is safe here").
- Found by a test and fixed: with "newest wins", a device whose clock ran ahead could make old edits beat newer ones. A changed record's time is now max(now, any version already seen + 1) (a hybrid-logical-clock idea), so an edit made after seeing a version always beats it
  whatever the clocks say; also for deletions (node test with a clock a day ahead).
- Tested in Chrome with a pretend cloud and short timings: first sync on connect; three quick edits = 1 read + 1 write; an edit during a run syncs right after; 2 failures retry and recover; offline then online; return-to-tab pull; no upload loop after applying remote changes;
  slow poll; hidden tab flush; part maker defers; expired sign-in stops without hammering; disconnect.
- Still needed (user + me): Google Cloud OAuth client (user created the project; steps given: enable Drive API, consent screen External, scope `drive.appdata`, Web client with origins https://fantapop.github.io and http://localhost:8000, add test users), the Drive `appDataFolder`
  provider (read / write one JSON file; GIS token flow with silent re-auth), a Connect / Disconnect control in the dialog, remembering "sync is on" across visits, a first-sync confirmation when this browser already has data.

### 2026-11-09 — Sync groundwork: records, merge engine, backup / restore (no cloud yet)

- Plan agreed: background sync through the user's own Google Drive hidden app folder (`appDataFolder`), optional sign-in, local storage stays the source of truth; first the provider-independent groundwork. Done here:
- **Model**: five kinds of record - `album:<id>` {name}, `item:<id>` {album, name, created, state}, `sig:<id>`, `pal:<id>`, `part:<id>`. The stores keep their formats; `collectLocal()` derives records and `applyRemote()` writes them back.
  No instrumentation of edit sites: changes are detected by hashing at sync time (`syncHash(stableStringify(data))`) against `meta` per key `{h, u, d}`; so renames / edits / deletions anywhere are picked up automatically.
- **Merge** (CORE `syncMerge`, pure): per record the newest `u` wins; deleted = tombstone `{u, d}`; ties: deletion wins, then the larger hash (every device decides the same); a record identical to the other side's copy on first sight adopts its time instead of
  claiming "newer"; tombstones expire after 180 days. Lost uploads self-heal (a device re-pushes what the cloud lacks). Concurrent writers can still overwrite each other for one round; the next round repairs it (Drive has no cheap conditional write for this).
- **Apply**: never throws on odd data (bad keys / invalid states / bad signatures / parts are skipped), limits respected (12 signatures, 12 parts), names stay plain text, quiet part refresh (no view switch), skipped while the part maker is open.
- **Backup & restore** (cloud button in the header -> dialog): one `.myrobackup.json` with all live records and their times; restore merges (older never overwrites newer, nothing is deleted, same file twice = no change). Works on phones. This also covers moving to a new browser today.
- **Provider interface** exists (`syncWith(provider)`: read -> merge -> apply -> write if changed) and is exercised with a pretend cloud; nothing is sent anywhere. Not wired yet: triggers (on change, on focus, interval), status UI, Google sign-in / Drive calls.
- Side fix found by the new phone runner: `Scene.add()` with nothing logged a console error whenever the overlay opened with no layers (guarded now).
- Tested: node (hash, keys, 15 merge scenarios incl. 3 devices, concurrent edit, delete vs edit, resurrection, lost upload, tombstone expiry, backup merge) and Chrome (A -> cloud -> empty B round trip of all five kinds, edit + deletion propagation, conflict, hostile records, backup / restore, dialog).
- Next (needs the user): create a Google Cloud project + OAuth client (Drive `drive.appdata` scope), then the Drive provider (Google Identity Services token flow, hourly silent re-auth), triggers, a small "Signed in as ... / Synced 2 min ago" status, sign out / "stop syncing". Open questions: where the sign-in lives (this dialog), what to do when the token expires while offline, and merging the auto-created "My album" duplicates.

### 2026-11-09 — Phone feedback round 1 (from the real iPhone screenshots)

1. + 2. **Filters took the screen** (one fixed part visible, "+23 more", expanding scrolled forever). Now on phones each filter is ONE line (name on the left, what is chosen on the right, e.g. "Fixed part  Ring 96/144 (Inside) ›"; "Any" when
   nothing is chosen); no pictures show until you tap a row, which opens it full-screen with every option (no "+N more"), a live "N of 7,836 patterns" count, Clear (that filter only) and Done. Ink and Paper are rows too
   (Ink: palette name; Paper: a dot and the color; the sheet holds Shuffle / Reset order). The closed "Filters" line shows the pattern count; all seven rows come to ~420 px.
3. **Oval swatches**: my 40 px touch minimum on buttons stretched the 32 px paper / ink swatches into ovals; swatches and the color picker are exempt now (checked: all square).
4. **No way out of the part maker**: the only exit was a small X that wrapped onto a second line. On phones the header is now "‹ Cancel" | "Custom part" | "Save part" first, then the name and size (Cancel still asks before discarding changes).
5. **Why a part can't be saved was a tooltip**: the reason is now visible text in the sticky header, right under the buttons (`#pm-msg`, moved out of the body where it was below the fold on phones): the "doesn't fit with any piece of the set"
   explanation while saving is blocked, and "N pen holes are too close to the edge (shown in red)..." (new; before it only appeared after pressing Save). Transient notes still fade.
- Tested at 390x844 (emulation): compact rows, nothing pictured until opened, full-screen sheet, live count, Done, summary text, Clear, 35 pen-hole chips with no fold, circle swatches, Cancel first and working, both messages;
  desktop re-checked (maker, custom row, overlay, print, text, albums drivers).
- Not done: iPhone landscape; the picker could remember scroll; a "reset all filters" shortcut.

### 2026-11-09 — Phone layout (phase 1)

- Feedback: full-screen overlay mode with an easy way back, plus a PIP-style preview while browsing patterns; the part maker should be its own full window (and is wanted on phones). Chrome's --window-size floors at
  ~500 px, so phone checks now use real DevTools device emulation (`tools/mobile.mjs`: 390x844 mobile viewport + touch events + dpr).
- Before: no mobile layout at all. The fixed 440 px side panel left the gallery ~28 px wide behind it, the filters took two thirds of the first screen, 39 controls were under 32 px.
- Now (width <= 760 px): Compose is a full-screen editor ("‹ Patterns" button first in its header, 100dvh, safe-area padding, picture capped at 36dvh); the gallery is two columns with the foot icons hidden; filters start
  folded and the label shows "(n on)"; tapping a pattern adds a layer WITHOUT opening the editor and shows the **preview bar** at the bottom (live canvas copy incl. spin / draw animation and text, "N layers", **Undo** = remove the last added,
  **Edit ›** or tap the picture = open the editor; hidden in Albums). In the editor only the selected layer row shows X/Y and its five sliders (3 columns), other rows are one compact line (tap to open). Part maker and signature
  dialogs are full-screen. Finger-sized controls (40 px) and 16 px inputs for narrow windows AND coarse pointers (tablets too); part maker hole hit radius 20 px for touch.
- Rendering: `overlayLive()` (editor open OR bar showing) now gates renderOverlay / animTick / animSync, so the hidden (off-screen) editor still renders for the bar. Desktop is unchanged (checked with the earlier drivers).
- Tested at 390x844: 2 columns, no bar before adding, add / add / bar text, ink pixels in the bar, bar at the bottom (81 px), Undo, a spinning layer moving in the bar, Edit -> full-screen 390x844, Back, selected-row
  expansion, filters count, Albums hides the bar, no control under 36 px (outside the dialogs), 16 px inputs.
- Not done yet (phase 2, ideas): pinch to resize / two-finger rotate on the picture, tap a slider value to type it, Web Share sheet for PNG / GIF / links, iOS canvas limits (cap PNG at 2048, warn before GIF), bigger part-maker handles
  beyond the hit radius, safe-area for the header notch in landscape, PWA install. Real iPhone Safari is untested (emulation only): please try it and report anything odd.

### 2026-11-09 — Canvas shape: wide, tall, Letter / A4, or custom pixel size

- New select in the Compose header (next to "Overlay"): Square (default), Landscape 4:3 / 3:2, Wide 16:9, Portrait 3:4 / 2:3, Tall 9:16, Letter / A4 portrait + landscape, and **Custom size…**
  (width x height boxes in pixels). The canvas is `{w, h}` (CORE `cleanCanvas`: whole numbers up to 9999, at most 6:1; square = default and is not written anywhere, so old files and links are untouched).
  It is saved in the setup (PNG / album / link `cv,<w>,<h>`).
- Geometry: the scene is 2 units tall and 2a wide. Layers fit the SHORTER side (so a pattern is the same size in a landscape or portrait canvas of the same short side); a layer's X / Y shift is
  thousandths of the WIDTH on both axes (square files unchanged); text / signatures keep x / y as shares of width / height, so a signature stays in "its corner" when the shape changes.
  Line weight stays relative to the width. Every output follows the shape: PNG (`dimsFor`: longest side 1024 / 2048 / 4096, or "Exact W x H" for a typed Custom size >= 100 px), print (2400 px longest side,
  `@page` landscape / portrait set while printing), GIF, SVG (viewBox 2a x 2), album thumbnails (and the albums grid keeps each aspect).
- Bug found on the way: the canvas element's own size beat the wrapper's CSS aspect-ratio (the picture stayed square); #ovc is now absolutely positioned.
- Interpretation: "larger / custom sized" = any shape plus exact pixel export; export resolution was already up to 4096 px. A taller canvas is limited to 42vh high in the panel like before.
- Tested in Chrome: 16:9 live size and signature layer, PNG 400x225 with the pattern fitting the height and centered, X 20% / Y 10% shifts as shares of the width, text landing at its x / y, portrait PNG,
  Custom 1920x1080 stays Custom and exports exactly, SVG 800x450, GIF 320x180, print canvas 2400x1350 + landscape page, thumbnail 16:9, old files open square, saved shape restored; node tests for
  cleanCanvas / exportDims / the link segment. Old square behavior re-checked with the earlier drivers.
- Not done: no physical units (inches / mm) or DPI, no "fit the canvas to the page" print settings beyond orientation, no canvas background other than the paper color, no resizing the canvas
  around the layers (changing shape keeps each layer's own size and shift).

### 2026-11-09 — American spelling; wording of the print question

- Replaced every British spelling (colour, centre / centred, normalised, behaviour, labelled, modelled, neighbouring, recognised, grey, travelling, re-centred / `recentredHoles` -> `recenteredHoles`) with the
  American one across index.html, CLAUDE.md, DEVLOG.md, tests and the dev journal; CLAUDE.md now says to use American English. Checked: no identifier or stored key changed except the one function rename.
- The print question now reads "We recommend you print in white to save ink. Would you like to open the print dialog with a white background?" with buttons Cancel / No, use the paper color /
  Yes, white background (same behavior as before).

### 2026-11-09 — Print on white when the paper is tinted or dark

- The Print button and Ctrl/Cmd+P now ask "Print on a white background?" when the paper isn't near white (`isNearWhite`: every channel >= 0xE6, so the cream default, white and light grays
  print straight away; anything tinted or dark asks). Three choices: Print on white / Print with the paper color / Cancel. Per-print only: `printWhite` is set just for that print and cleared on
  afterprint, and `fillPrintCanvas` swaps the render background (and the paper used for auto-colored text, so it prints dark on white) - the stored paper color, state, links and PNGs are untouched.
- Limits: the browser's own File > Print menu can't be intercepted (it fires beforeprint with no chance to ask), so it prints the paper color; pale line colors chosen for a dark paper
  can look faint on white (the dialog says so; no automatic recoloring). Tested with `window.print` stubbed (cream/white print straight away; dark asks; each button; paper unchanged;
  Ctrl+P intercepted; beforeprint path; white page + dark auto text sampled from the print canvas) and a node test for `isNearWhite`.

### 2026-11-09 — Clicking a pattern opens the overlay

A tile click with the overlay closed now opens it (`setCompose(true)`) and adds that pattern as a layer; with it open it adds another layer as before. Tiles always show a pointer cursor.
The flash is applied after opening, to the tile looked up again, since opening the panel re-flows the grid. Earlier layers are kept if you closed and reopen this way. Tested in Chrome.

### 2026-11-09 — Text and signatures split: ad hoc text needs no saving

- Feedback: the feature was built around signatures (saved, reused) but was being used for plain text, which shouldn't have to be saved first. The tab now has two clear paths:
  **Text** row on top (type, pick a font, Enter / ＋ Add: goes mid-picture, sized to its length, staggered) and a **Saved** (signatures) row (dropdown + Add / New… / rename / Delete).
  Placed items live in the list either way; selecting a typed one shows an **Edit** row (text box + font, changes it in place; an empty box keeps the old text) and a **Save**
  button that copies it into Signatures (shows "Saved ✓" when it is already there). Drawn signatures have no text editor. The "New…" dialog is back to being "New signature" (draw or type
  a name, saves it and adds it).
- No data format change: a placed text is the same `{kind:'t', text, font}` as before; the library is just no longer a prerequisite. Drive-by: selects / text inputs in these tabs now use the
  theme's control colors instead of the browser default.
- Tested in Chrome (library stays empty after adding text; Enter adds; blank refused; edit only the selected; font in place; Save -> Saved ✓ -> Add again from the list; drawn signature has no editor;
  New… still saves and adds). Old drivers that added text through the dialog (d108 / d111) are stale.
- Not done: nothing to rotate, align or reorder text yet (later = on top).

### 2026-11-09 — Finer Spin / Draw speeds; the draw restarts instantly

- Feedback: the integer 1x / 2x steps were too coarse, and the 20% hold on the finished shape was a visible gap. Now **Spin** and **Draw** step by 0.1 (sliders +/-5 and 0..5; the stored
  limit stays 10 so older files are untouched; values are rounded to tenths by `cleanSpeed`). Draw has no hold: it draws 0 -> complete, then the next draw starts at once. Phase 0
  is still the finished shape (`drawFraction` returns 1 at exact whole cycles), so thumbnails, links and a freshly opened file never show an empty layer; GIF frames are sampled half a
  frame in so a draw never lands exactly on its restart.
- The catch with decimals: a layer only repeats after a loop if its speed is a whole number, so a single wrapping 0..1 phase would jump at the loop end. Fixes per output:
  live playback uses an unwrapped phase (loops since the start) - no seam at all; SVG gives every layer its own period (loop / speed), so every speed repeats exactly;
  GIF is one loop long, so it is rendered `loopMultiple(...)` loops long (1, 2, 5 or 10, from the speeds' tenths) when that fits in 600 frames (e.g. spin 1.5 -> 2 loops; 1.1 -> 10
  loops, fine at a 2 s loop / 10 fps, too long at 8 s / 20 fps), otherwise one loop with a message saying it will jump a little where it repeats (use whole numbers).
- Share links: whole speeds keep the old base-36 token (`s2`, `d3`) so old links read the same; tenths are decimals (`s1.5`, `d0.3`). PNG / albums store plain numbers.
- Tested: node (cleanSpeed, drawFraction, loopMultiple, decimal link round trips and clamps); Chrome: 0.1 sliders and labels, draw ~0.25 / 0.75 / 0.5 at those phases and 0.999 -> 1.0005 is full -> blank,
  live phase passes 1 without wrapping, SVG periods (loop/speed) and stills vs WebGL (IoU 0.95 at phases 0.37 and 1.61), GIF lengths (40, 200, fallback 160 frames), and the 10-loop GIF's
  last -> first change is a normal step (531 vs 500 px). Old drivers asserting the 20% hold / one 8 s SVG period are stale.
- Not done: no way to type an exact speed (slider + arrow keys only); the slider range is 5 (use a shorter loop for faster).

### 2026-11-09 — Per-layer Draw (a pen draws the curve out)

- New 5th slider per layer row, **Draw**: 0 = off, 1..10 = how many times per loop the curve is drawn out (right = faster; loop length / N seconds per draw). Same idea
  as Spin (whole numbers per loop repeat seamlessly; layers choose independently; combines with Spin, X/Y, size...). Row height unchanged (5 columns of ~76 px).
- Cycle (`drawFraction`): each cycle starts COMPLETE, holds for 20% (`DRAW_HOLD`), clears, then draws out over the remaining 80%. Chosen so phase 0 is the finished shape:
  album thumbnails, links, a freshly opened file and a paused-at-0 picture never show an empty layer. The pen moves at constant speed by arc length, not per sample
  (`cumLengths` + `drawCount`; sampling is adaptive so segment count would speed up / slow down).
- Rendering: Line2's `instanceCount` limits how many segments draw. Geometry is shared by copies of a pattern, so each line sets the count in its own `onBeforeRender`
  (a per-layer geometry object would leak GPU buffers on every edit; the first attempt, dropped). `setLineFrame` moves a line to a phase (live, GIF, album thumbnails).
  Save PNG / Print capture the frame on screen, including a partly drawn curve (the saved setup keeps `draw`, so reopening shows the finished picture).
- Exports: GIF frames draw out; animated SVG uses `pathLength="1"` + a dash whose offset is animated with `<animate>` (values 0;0;1;0, keyTimes hold/cut/draw) at loop/N seconds;
  share link layer field `d<b36>`; albums animate draw-only items too.
- Tested: node (codec, clamp, fraction, arc-length count); Chrome: complete at phase 0 and in the hold, blank at the start of a draw, ~half drawn halfway (0.51), a copy of the same pattern
  without Draw untouched, SVG stills match WebGL (IoU 0.96 at three phases), GIF ink falls and rises across the loop, a draw-only album item animates.
- Not done: no draw direction (reverse / erase), no per-layer hold length, drawing isn't shown in PNG-embedded state (only in the image).

### 2026-11-09 — One Save & share tab; several texts / signatures per overlay

- The Animate tab is gone: the GIF and animated-SVG exports moved into **Save & share** (under an "Animation" heading) and the loop length moved to the
  panel header next to Pause (`#ov-anim`: Pause + "Loop [8] s", shown only while a visible layer spins), so it sits beside what it controls.
- The Signature feature is now **Text & signature** and holds a list: `sigs` (max 8, `SIG_LIMITS.placed`), `sigInst` = the selected one. Why: it was being
  used as a text overlay, so one item was too few. Tab: a "Saved" dropdown (the library, max 12) with Add / New… / ✎ rename / Delete, a list of what is on the picture
  (click to select, ✕ to take it off), then controls for the selected one (size, %, color, Auto, Copy, Reset). New… saves to the library AND adds it. The first item lands
  bottom right as before, later ones mid-picture, staggered. On the picture: click selects, drag moves, corner handle / wheel resizes; the topmost under the pointer wins;
  the selected one shows its frame while the tab is open. State key is `signatures` (array); share links carry one `g,` segment each; older files / links / albums with a single
  `signature` still read (`canonSigInstances`). PNG, print, GIF, SVG (one transparent image of all of them) and album thumbnails draw all of them (`drawAllSignatures`).
  Tested: three texts, selecting by row and by clicking the picture, drag moves only the selected one, size / color independent, Copy, remove, link / PNG / album round trips,
  an old single-signature file, the cap of 8, GIF and SVG still export. Node tests cover the codec (several, old single, limits).
- Not done: no way to reorder texts (later = on top), no per-text rotation, no bold/size-by-font choices beyond the six fonts; the saved list is still capped at 12.

### 2026-11-09 — Duplicate layers, reordering, tabs, custom-parts collapse, animated SVG

1. Duplicate layers: layers are keyed by their own id (`L<n>`), not the pattern, so the same pattern can be added again (copies can be sized / moved / colored /
   spun separately). Grid tiles lost their selected state (outline + check badge, and the tile-takes-layer-color repaint); clicking a tile always adds a layer and
   flashes it. Share links, PNGs, albums already stored layers as a list, so duplicates round-trip with no format change. Geometry is cached per pattern and
   shared by copies (`releaseCurve`). Removal is the row's X; "Clear" removes all.
2. Custom parts row now collapses to one line with "+N more" like the other rows (`applyCollapse` now works on a row's direct children so a part's chip and its
   edit button fold together; "＋ Make a part…" moved to the front and is `nofold`). A selected part stays visible when folded (same rule as other rows).
3. Tabs: the top Patterns / Albums and the Compose panel's Layers / Signature / Animate / Save & share are now plain text tabs with an underline on the current
   one (not buttons); Clear stays a button. (The part maker's Shape / Pen holes tabs are still pill buttons - not asked for.)
4. Formats: GIF is 256 colors, ~9 KB/frame (a 40-frame 300 px loop = 360 KB, 640 px much more), repeats forever (Netscape loop extension, verified) but some viewers
   (e.g. Preview) show it once. Added **animated SVG** (`makeSvg`): each layer is one path of its real curve with an `<animateTransform>` rotate (repeatCount indefinite),
   ~28 KB for 3 layers, vector-sharp at any size, exact timing; plays in browsers / as <img>, not in chat apps or image editors. Verified: parses, turn counts/direction,
   and still frames match the WebGL render (overlap 0.93-0.94 at three phases). Considered and not built: animated WebP (canvas can't encode animated WebP; Safari
   can't encode WebP at all, we'd need our own muxer of per-frame WebP stills, and lossy frames blur thin lines), APNG (lossless but bigger than GIF for this),
   MP4/WebM via WebCodecs + a muxer (smallest by far and shareable everywhere, but lossy on thin lines and no built-in loop - the likely next addition if wanted).
5. Reordering: a grip at the left of each layer row; drag it up/down (the list follows the pointer, applied on release) or use the arrow keys when it has focus.
   List order = drawing order (later = on top; verified by pixels). Row grid got a column: gaps/boxes trimmed so rows stay 88 px.
Testing: headless drivers for each (the same pattern twice, link / reopen round trip, drag + key reorder with red-over-blue pixel check, custom row with 8 parts,
SVG vs WebGL). Old drivers that used the removed Move row (`pos-x`) are stale.

### 2026-11-09 — Dedicated Move row removed

The position row at the top of the Layers tab (X / Y boxes, Center button, "or drag the picture") is gone: dragging the picture moves
the highlighted layer, and each layer row's own X / Y boxes give precise values (type 0, 0 to recenter; the Center button was dropped).
The layer list gains ~34 px. `syncPos` now only keeps the active row's boxes in sync with a drag and sets the picture cursor. Tested in
headless Chrome: boxes shift the layer, drag moves the highlighted layer and its boxes follow, typing 0 / 0 recenters, row height unchanged (88 px).

### 2026-11-08 — Albums animate; Play/Pause in the panel header; light / dark theme

- Album thumbnails of setups with a Spin now animate (`thumbRig` / `thumbDraw` / `thAnimTick`): lines are built once per item and only
  rotations change per frame; only on-screen spinning items are drawn, round-robin inside a ~12 ms budget (big albums get a lower frame rate,
  not a janky page); stops outside the albums view / hidden tab / prefers-reduced-motion. Each item uses its own loop length. Static thumbnails
  are unchanged (phase 0). Tested: static item's pixels constant, spinning item changes every sample, stops when leaving the view.
- The picture's round ⏸ glyph button (off-center, out of place) is now a normal labeled button with centered SVG icons ("Pause" / "Play") in the
  Compose panel header next to the title; shown only when a visible layer spins. Alternatives considered: a button in the tab row (no room next to
  Clear), an overlay on the picture (what was wrong), a transport bar under the picture (costs height).
- Light / dark UI: every UI color is a CSS variable (`--ctl --line --sunk --edge --on-accent --accent-ink ...`); `:root[data-theme=light]`
  overrides them. A <head> script picks the theme before first paint (saved `myrograph.theme`, else `prefers-color-scheme`); the header sun/moon button
  toggles and saves; with no saved choice the page follows the system live. `color-scheme` is set so native controls / scrollbars match. The paper (what patterns are
  drawn on) is the user's choice and does not change with the theme. The part maker's canvas reads its grid / handle colors through `themeColors()`.
  Accent as text uses `--accent-ink` (darker in light mode). Checked by screenshot in light: gallery, Compose panel, part maker.
- Not done: no "auto" state in the toggle once a choice is saved (clear localStorage `myrograph.theme` to go back to following the system); (the signature dialog and palette editor were checked by screenshot too).

### 2026-11-08 — Animation: per-layer spin, loop length, GIF export

Design: a layer's `spin` = whole turns per loop (-10..10, + clockwise); one global loop length `loopSec` (2-60 s, default 8). Integer
turns keep every GIF seamless; the loop length is the speed knob (1 turn / 8 s = 7.5 rpm; 60 s = 1 rpm). Rotation is about each
layer's own origin, which is where X / Y shift moves it, so the center of rotation travels with the layer. Chosen over free deg/s speeds
because fractional speeds don't loop; if finer speeds are wanted later, allow half turns for symmetric patterns.
Implementation: CORE `layerAngle` / `bakeRot` / `LAYER_SPIN` / `LOOP_SEC`, share link `s<b36>` layer field and `loop,<s>` segment. UI: a 4th
"Spin" slider in each layer row (row height unchanged), ▶/⏸ button on the picture (shown only when something spins), an Animate tab (loop
seconds, Save GIF, size 480/640/800, fps 10/20/25). Playing only sets each line's `rotation.z` per frame (`animTick`); edits rebuild the scene at the
current `animPhase`. Save PNG / Print capture the frame on screen; the PNG is saved with baked whole-degree angles (spin kept) so
reopening it shows the same picture. Albums / links / thumbnails use phase 0. GIF: gifenc (CDN, imported on first export), per-frame
256-color palette, own scene + layer snapshot so edits during export can't interfere, infinite loop. Measured: 40 frames at
240-300 px decode in Chrome's ImageDecoder, frames differ, repeat = infinite (~360 KB at 300 px / 40 frames).
Testing note: headless virtual time doesn't fire requestAnimationFrame; the driver shims it with setTimeout.
Not done: no APNG/WebM, no scrubber, no spin in album thumbnails, GIF not embedded with the setup (use Save PNG for that).

### 2026-11-08 — Filter chips only as wide as their picture

The Fixed / Moving piece chips drew each icon in the row's one shared square box (sized for the largest piece), so a 24-tooth
wheel took as much width as an 84-tooth one. Icons are still to scale (same pixels per tooth in both rows), but each box is now
only as wide as its piece (`fitW`, `tight` flag on `trackIcon` / `rollerIcon`; the height stays uniform so rows stay tidy;
the rack was already wider). Chip widths went from ~70 px to 32-70 px: at 1300 px the whole Moving row fits on one line
(was 8 chips + "+11 more"); at 900 px 13 chips show (was ~6). The layer list and other icons (no `tight`) are unchanged.

### 2026-11-08 — Wider line-width range

Layer Line width now spans 0.5-20x (was 0.5-6x). The slider is logarithmic (like Size) and rounds to quarter steps, so thin
lines keep fine control (1x sits ~19% along). `LAYER_WIDTH` in CORE; the share-link decoder clamps to it (the link stores tenths,
so values like 12.25 round-trip as 12.3 - only quarter steps from the slider matter and those survive). Old files/links unchanged.

### 2026-11-08 — X / Y on each layer row; live line width matched the PNG / print

- Each layer row now has small X / Y boxes between the name and the remove button (row height unchanged at 88px). They,
  the top position row and the picture drag all stay in sync (`syncPos` updates whichever box isn't being typed in); focusing
  or touching a row makes it the active layer.
- Bug (reported via the user's son): the picture on screen had thicker lines than the print. Cause: the live overlay renderer used
  `setPixelRatio(pr)` + `setSize(css)`, but three r170's `LineSegments2.onBeforeRender` overwrites `LineMaterial.resolution`
  with the renderer *viewport in CSS px*, so on a retina screen (pr 2) the line was 2x too thick relative to the picture. PNG, print
  and the tile/thumbnail renderer use ratio 1 and were right. Fix: the live overlay now renders at ratio 1 with `setSize(css*pr)`.
  Measured ink coverage of screen vs the 2400 px print canvas at device scale 2: 0.01286 vs 0.00644 before, 0.00636 vs 0.00644
  after (0.00628 at scale 1). Consequence: on retina screens lines look half as heavy as before, now what the PNG always had.
  If a heavier look is wanted, raise the 1.6 in `renderOverlay` / `makePng` / `fillPrintCanvas` together.

### 2026-11-08 — Per-layer X / Y shift

Plan/outcome: each layer gets `dx`/`dy` (thousandths of the picture width, +/-1000, x right, y down; 0 = centered).
UI without adding per-row height (the user cares about layer-list room): one layer is "active" (accent bar on its row;
last added, or whichever row is clicked) and a single position row at the top of the Layers tab edits it - X / Y
percent boxes, "Center", plus dragging the picture moves the active layer (a drag on the signature still moves the
signature). Renderer: `line.position` in `makeLines` (so live view, PNG, print and album thumbnails all agree; the
layer rotates about its own center, then is shifted). Persisted as `dx`/`dy` in overlay state (only when non-zero, so
old files are unchanged) and as `x<b36>` / `y<b36>` tail fields in the share-link layer segment (decoder reads the
optional width number and any of `1`(legacy fit)/`x..`/`y..` in any order). Shared size scale ignores shifts.
Verified: node tests (codec roundtrip, clamping, old links), headless Chrome (boxes, drag, Center, row highlight,
applyState, share roundtrip; row height still 88px). Row padding gained 6px/4px so the accent bar doesn't hit labels.

### 2026-11-08 — Stretch to fit removed; wider Size range

The per-layer "Stretch to fit" checkbox (added a few hours earlier, replacing the global Base scale) was judged not useful: it rarely changed anything, Size can do the
same, and it cost layer-row height (88 -> 110 px). Removed together with all the plumbing (`l.fit`, the checkbox, the flag in `overlayState` and links). Sizing is
one rule now: the largest visible layer, by real size, fills the picture and every layer's Size scales its own copy. Size now runs 10-500% (`LAYER_SIZE`; real pattern
sizes span 3.9-59.3 teeth, 3.9x inside one ring, so matching a small pattern to a big one needs ~330-390%) on a LOGARITHMIC slider (position 0..1000 <->
10..500%, `posToSize`/`sizeToPos`, 100% at ~589) so a step is a similar percentage change everywhere; `decodeShare` clamps to the same range.
Old files are converted, not broken: a file or album item that stretched layers (global `baseScale: 'fit'`, the `/f/` link segment, or the briefly existing per-layer
flag, still READ by `decodeShare`) gets, per stretched layer, the Size that draws the same picture (`bakeLegacyFit`, clamped to the range; used by `applyState` and
album thumbnails; saving again writes plain sizes). Verified: an old "Fit each" file opens with Sizes 100% / 340% and both layers fill as before; its album thumbnail
too (93% vs 27% for a "True size" item). The earlier `keep part` fix (remove button located by `button[title=Remove]`) stays.



### 2026-11-08 — "Stretch to fit" per layer replaces the global Base scale

The global "Base scale: True size / Fit each" switch was confusing (see the measurements in the chat: real pattern sizes span 3.9-59.3 teeth, so the Size
slider alone cannot even out a 4x difference) and all-or-nothing. Replaced by a "Stretch to fit" checkbox on each layer (`l.fit`). Sizing in `makeLines`: the shared
scale is still set by the largest layer by REAL size (so real proportions hold), a layer with `fit` fills the picture by itself (`0.92 / ownMaxR`), and its Size
slider scales from there. Deliberately the shared scale ignores `fit` when picking the largest layer, so ticking a box changes only that layer (the first version
excluded stretched layers, which made the others grow when you stretched the biggest; reverted). Compatibility: `overlayState` no longer writes `baseScale`; files and
links that carry the old `baseScale: 'fit'` / `v1/<paper>/f/...` open with every layer stretched (`legacyFit` in `applyState`, `st.baseScale` in thumbnails); share links
carry the flag as an optional 9th layer field (`...,width,1`; width is then always written), links without it are unchanged. Found along the way: in `buildLayerList` the remove button was
located with `querySelector('button')`, which returns the "＋ keep part" button when a layer has one, so keeping a part also removed the layer; now `button[title=Remove]`.



### 2026-11-08 — Compose panel: tabs and compact layers; click-to-toggle pen removed

1. Removed the "Click to start and stop" checkbox in the signature dialog (clicking it drew lines on the pad); Space/Shift-hold and press-and-drag remain.
2. The Compose panel had grown to ~700px of controls above the layer list (a 440px square picture, two toolbar rows, album row, signature row and a 3-line
   signature controls row), leaving 0px for layers on a 550-670px-high viewport (77px at 813). Now: the picture is capped at 42vh and centered; under it a tab bar
   `Layers | Signature | Save & share` (+ Clear on the right) shows ONE pane at a time (`setOvTab`), so the layer list gets all the leftover height (measured
   229 / 299 / 380px at viewports of 553 / 673 / 813). Adding a layer from the grid switches to Layers. The layer rows were compacted: Rotate / Size / Line sit side
   by side (`.tune`, 3 columns) so a row is ~88px instead of ~122. The message line (`#ov-msg`) stays directly under the picture on every tab. All element ids are
   unchanged. Possible next steps if still tight: collapse a layer row to one line until clicked, or make the panel a bottom sheet on narrow screens.

### 2026-11-08 — Signatures: names, trackpad drawing, direct scaling

Feedback on the first version: (1) no way to name signatures; (2) drawing on a trackpad means click-and-sign at once; (3) wants to scale the signature /
change its font size. Names: a signature may carry `name` (label only: `sigName` cleans it with `cleanName`, it is NOT in the id and NOT in share links);
the dialog has a Name field (blank = the typed text, or "Signature N" for drawn ones), a Rename button edits it later (blank goes back to the default),
and saving the same content again renames the existing entry instead of duplicating it. Trackpad: three ways to put the pen down in the Draw tab: press
and drag (always), HOLD SPACE OR SHIFT and just move the pointer (pen down while the key is held; moving off the pad lifts it; a red ring/dot marks the
pen), or tick "Click to start and stop" (mouse clicks toggle the pen; touch/pen still drag). Gotchas handled: Space must not press a focused button or
toggle the checkbox (they are blurred after clicks; Space is swallowed in the draw tab), window blur releases the key. Scaling: the size slider is now
2-100% of the picture width with a % box beside it, hovering the signature shows a dashed frame and a corner handle (drag it to resize, top-left corner stays
fixed), and scroll / trackpad pinch (ctrl+wheel) over it resizes; a typed signature scales like a font size (its width is fixed, the font follows).
`sigKeepInside` now also leaves room for the frame and handle so the handle can never end up off the canvas. Not done: separate font-size vs width, line thickness for drawn signatures.

### 2026-11-08 — Signatures on overlays

Request: sign a compiled overlay like a piece of art: enter a signature, keep a list, optionally add one, move it around; one per overlay is enough.
Built: a Signature row in the Compose panel (dropdown of saved signatures + "＋ New…" + Delete; below it Size, color, Auto, Reset when one is
chosen) and a dialog with two ways to create one: Type (name + handwriting-style font) or Draw (pointer events on a pad; strokes thinned to fit
`SIG_LIMITS.points`, scaled to 0..1000 across, smoothed with midpoint quadratic curves when drawn). Typed signatures use CSS font stacks
(Snell Roundhand / Segoe Script / Bradley Hand ... fall back to `cursive`), so the exact look depends on the device's fonts; drawn ones look the same
everywhere (the reason both exist). A placed signature is `{ sig, x, y, size, color }` in thousandths of the picture; color null = auto (light ink on dark
paper); it is clamped to stay fully on the picture (`sigKeepInside`). Dragging works on a transparent canvas over the picture (`#sigc`, hit-test on the
signature's box); new signatures start in the bottom right corner. The overlay's signature is part of `overlayState()` (PNG chunk, album item, link
segment `g,...`: typed ~120 chars, drawn ~400) and is painted by `drawSignature` onto the live layer, the PNG (the GL image is composited on a 2D canvas first),
the print canvas and album thumbnails. "Clear" clears layers only (the signature stays). Opening a piece signed with a signature you do not have shows it as
"(from file)" in the dropdown; choosing another from your list replaces it. Not done: several signatures, rotation, a signature on a layer-less overlay export
(allowed, but Print needs a visible layer), importing fonts.

### 2026-11-08 — Smooth hole spiral; resizing no longer scrambles holes

Two reports on the spiral fill. (1) It still looked scattered: 0.7 rad per hole is ~2pi/9, so consecutive holes jumped ~40 degrees around the
part (fine at icon size, a starburst at full size). The spiral is now one smooth arm over `SPIRAL_TURNS` = 1.4 turns (angle `2pi*1.4*k/(n-1)`, still
rim to center, radius fraction 0.9 -> 0.22), used by both `fillHoles('spiral')` and the icons' `holePoints` for the set's round wheels (cosmetic: only a
round wheel's hole distance matters). (2) Resizing the part jumbled the holes: the Size slider rescaled the already-rounded quarter-tooth holes at every
step, so errors compounded (measured: shrink to 24 and back to 63 left holes up to 12.7 teeth from their start, two on the same spot). Now every size is
scaled from the layout before the first resize (`ed.nBase`, replaced only when the holes were edited since: it is compared with `stamp`), so going back
restores the layout exactly (0.00 teeth). Resizing far down can still push holes out of the shape; they turn red, nothing is lost.

### 2026-11-08 — Spiral hole fill: a real spiral, not a scatter

Correction to the previous entry: the golden-angle (Vogel) layout I first used spreads holes evenly but looks scattered, not like the set's
wheels (one visible spiral arm, 0.7 rad per hole). Pen-curve-wise the two are equivalent (each hole has its own distance and direction);
the real spiral additionally makes neighboring hole NUMBERS neighbors on the part and looks like the set. `fillHoles(..., 'spiral')` now does
what the wheels do: `n = round((N/2 - 7) * 2/d)` holes (d = 2 gives the real count, e.g. 25 for a 63; from the PERIMETER N, not the longest radius,
which overcounted elongated shapes), hole k at angle 0.7k and at (0.9 - 0.68 k/(n-1)) of the way out to the outline along that direction
(`edge()`: ray / outline intersection, minus the 1-tooth margin), in generation order (hole 1 = outermost), invalid points skipped. 0.7 rad ~ 2pi/9, so
holes sit on nine spokes. Tests: circle N=60 reproduces the real 60 wheel's hole count with 0.7 rad steps and decreasing distance; N=84 gives 35.

### 2026-11-08 — Custom parts' holes default to a radial spiral

New parts used to get their holes in a row along the x axis (`fillHoles(..., 'x', 1.5)`), unlike the set's wheels (a spiral, which the icons
imitate via `holePoints`). New fill mode `'spiral'` (golden-angle / Vogel spiral, `r = c*sqrt(k)`, angle `k*137.5 deg`, spacing `d/1.1`), now the
default for a new part, for a preset change that leaves no valid holes, and the first option in the Fill dropdown (default spacing 2 teeth, `DEFAULT_SPACING`).
It matters beyond looks: on a non-round part hole DIRECTION changes the pen curve, and a row only samples one axis. Oval N=48: row = 4-6 holes /
curves, spiral = 13 (24 at spacing 1.5), each a distinct curve (a real 48 wheel has 17 holes); N=84: 8 vs 35. Rows along x, both axes and grid remain as options.

### 2026-11-08 — Ring names include the side

Ring tracks are now named "Ring 96/144 (Inside)", "Ring 96/144 (Outside)", "Ring 105/150 (Inside)", "Ring 105/150 (Outside)" (`track.name`,
set in `buildCatalog`). Chips show the name on two lines (tooth count only in the tooltip); tile footers, layer rows, the maker's fit grid
tooltips and its preview label use the full name and no longer append "· inside/outside" for rings (other fixed pieces still say "· outside").
Ids (`ring96-in`, ...) and saved files are unchanged.

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
the rolling circle (N), the fixed piece and the hole's DISTANCE from the center. Different bodies gave identical curves (0.0000),
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
on purpose: Mirror, Surprise me, grid / both-axes fill, rim-to-center numbering, the fit grid, the preview and its scrub slider.

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
   piece's center sweeps much faster (steps of 1.2-1.7 teeth = straight chords and hooked cusps; the path is mathematically
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
  Fixed-part chips are now labeled by ring and side: "Ring 96/144 inside (96)", "... outside (144)", etc. Track names became
  "Ring 96/144" (footers show "· inside/outside" after it). There is no "150 inner": 150 is the outer edge of the 105 ring.
- Relative sizes verified, not changed: every wheel is within 0.1% of N/pi at one px-per-tooth scale in both rows (84 wheel =
  48.7 px, 24 wheel = 13.9 px), the 144 and 150 rings differ by 4% and many neighboring wheels by 5-7%, so they look alike
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
roller), and a custom part's re-centered fixed copy shifts its holes by the same centroid (`recenteredHoles`; node-tested).
The rack has no holes (`holePoints` returns []; forgetting that crashed the whole Fixed row while building, caught before
pushing). The Cross's teeth go only on the four arm ends, on the 60-tooth pitch circle it rolls on, not in the notches:
`crossTeeth()` draws four short toothed arcs of radius 1 (the icon is normalized to the Cross's largest radius, which is that
circle), spanning +/- asin(hw/Rt) around each axis, ~5.5 teeth per arm (`CROSS_ARM` constants shared with `crossBodyDense`).

### 2026-11-08 — One scale for the Fixed and Moving rows

Each row used to be scaled so its own largest piece filled the icon (the 150 ring for Fixed, the 84 wheel for Moving), so the same
wheel was drawn bigger in the Moving row than in the Fixed row. Now both rows share one reference radius (the largest moving piece,
13.4 teeth, fills the standard 56 px box) and the Fixed row's icon boxes are taller (`box` = largest ring / ref + .15, ~94 px) so
the rings fit at that same scale; the rack gets a wider box. Every piece in both rows is therefore drawn at the same px per tooth
(measured: wheel 60 = 34.8 px in both rows). Row labels now center on the first line using the measured chip height
(`applyCollapse` sets the label's min-height) instead of a fixed 82 px, since the two rows have different heights. Trade-off: the
Fixed row is taller and fits fewer chips per line (9 collapsed at 1300 px).

### 2026-11-08 — Overlapping combos removed; teeth and holes in the piece pictures

1. Dropped the "Include overlapping combos" chip: combos whose pieces would collide (`p.ok` false) are never listed, and the
count no longer mentions them ("7,836 of 7,836 patterns"). `ok` is still computed (the part maker shows red/green from it);
the "overlaps" tag in the tile footer is gone (it could no longer appear).
2. Piece pictures (chips, tile footers, layer rows, maker grid) now show teeth and holes. Teeth are a dashed band along the
pitch outline with `pathLength = N` and `stroke-dasharray=".5 .5"`, so any shape gets exactly N teeth for free (`teeth()`);
rings get teeth on both the inner and outer edge. Below ~2 px per tooth neighboring teeth are merged (`m`) so the texture
stays visible: the picture is an illustration, the tooth count is on the chip. The Cross has no teeth ring (its teeth are only
on the arm ends, its outline is the silhouette). Pen holes were already drawn but round wheels' holes sit on a line at
0.3-tooth spacing and merged into a bar; round wheels' holes are now displayed along a spiral (`holePoints`, 0.7 rad per hole,
like the real wheels; only a round wheel's hole distance matters for the pattern, so this is cosmetic and the highlighted
hole is just as valid). Shaped wheels and custom parts show their real hole positions.

### 2026-11-08 — Rack icon uncropped; ring icons show a small wheel

Rack: it is 35 teeth from center to end, more than the row's reference radius (the 150 ring, 23.9), so at true scale it was
1.46x wider than its square icon and the curved ends were cropped away (two bare lines). Icons now accept a wider viewBox
(`svg(body, hw)`; `trackIcon` widens it when `s + .15 > 1.15`, i.e. only the rack) so it is drawn whole, at true scale, in a
wider chip. Rings: dropped the orange outline on "the circle it rolls on"; instead a small wheel circle is drawn where it
would sit: inside the opening (touching the inner edge) for inner tracks, against the outer edge for outer tracks, at 45
degrees up-right so it stays inside the icon box. Applies everywhere `trackIcon` is used (chips, tile footers, layer rows,
maker compat grid).

### 2026-11-08 — "+N more" pills line up

The pills followed the last visible chip, so each row's sat at a different x. `.rowtoggle` now has `margin-left: auto` (pushed to
the end of its line, i.e. the row's right edge) and a fixed 84 px width with centered text, so all rows' pills share both
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

Row labels were vertically centered on the whole row, which looked wrong once rows wrapped or expanded. They are now
`align-self: flex-start` with a min-height equal to the first line (24 px normally, 82 px for the `.row.big` picture rows),
so each label is centered on its first line of chips. Removed the "Relative sizes" toggle (and `relSizes`, `SIZE_KEY`, the
function-valued chip html): the Fixed part / Moving piece pictures are always drawn to scale. The stale
`spirograph.relsize` localStorage key is simply ignored. `trackIcon`/`rollerIcon` keep their optional `ref` because the
tile footers, layer rows and custom chips still use the normalized form.

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
- Rollers are NOT re-centered (origin = handle center, so hole coordinates stay put while dragging); the fixed
  version of the part IS re-centered (else its pattern is off-center in the tile).
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
button labeled "+ Add to \"<album>\"" (name truncated), plus a "+ New album..." entry; the
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
one). Raw (unnormalized) curves are cached per pattern (`traceRaw`) so color/rotation/scale
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
