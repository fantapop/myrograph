# myrograph — handoff notes for a new session

Read `DEVLOG.md` first (Current state + dated log). This file is just the orientation.

## What it is
Single-file static web page, `index.html` (three.js from a CDN import map, no build, no server).
Gallery of gear-curve patterns from a Deluxe-style spirograph-type gear set (see `README.md`), with an
overlay composer, PNG save with embedded setup, albums (localStorage + export/import) and
share-by-URL-fragment. Repo: https://github.com/fantapop/myrograph (public, MIT). Hosted on GitHub Pages from `main`:
https://fantapop.github.io/myrograph/ (redeploys on every push; share links only work for others when copied from there).

## Layout of index.html
- `PARTS` (top of the CORE block): tooth counts and hole layouts. Edit here to change the set.
- CORE block (`BEGIN CORE` ... `END CORE`): pure math, no DOM: outlines, rolling contact, collision
  check, PNG text chunks, share-link codec. Tested by `tools/test.mjs`.
- UI below it: filters, virtualized grid, offscreen WebGL -> per-tile 2D canvases, Compose panel
  (overlay), save/open, albums view, share links, and the custom part maker (`openMaker`, section
  "custom parts: library, filter row, maker dialog"; `<dialog id="pm">`).
- Custom parts (CORE: `canonPart`, `makePart`, `customCombos`, ...): star-shaped outline from radial handles
  (`k` x `n` handles, optional mirror), perimeter scaled to `N` teeth; holes in quarter-tooth ints.
  Ids are `c` + hash of the content, so a part is immutable: editing makes a new id and saved things
  keep their own copy of the definition (`parts` in PNG/album state, `p,...` segments in share links).
  `library` (localStorage) is what the user made/kept; `registry` also holds guest parts from opened
  files. Custom combos live in `CUSTOM`, never in `ALL` (own filter row). Part names are sanitized
  (`cleanName`) because they go into innerHTML.

- Signatures (CORE: `canonSignature`, `canonSigInstance`, `encodeSig`/`decodeSig`; UI section "signature"): a signature is
  `{kind:'t', text, font}` (font = a key of `SIG_FONTS`, a CSS stack) or `{kind:'i', ar, s: strokes}` (hand-drawn, 0..1000 coordinates),
  id = hash of its content. A placed one is `{ sig, x, y, size, color }` (thousandths of the picture; color null = auto black/white by paper); the overlay
  carries a LIST: `sigs` (max `SIG_LIMITS.placed` = 8), `sigInst` = the selected one. It lives in `overlayState().signatures` (PNG / album / link carry copies; one
  `g,...` link segment each; older files have a single `signature`, read by `canonSigInstances`) and is painted by `drawSignature()` onto the live layer `#sigc`, the PNG,
  the print canvas, the GIF / SVG and album thumbnails (`drawAllSignatures`). The UI calls them "Text & signature".
  Two ways in: ad hoc text (`addText`: typed in the tab, Enter adds, no library; the Edit row (`editText`) changes the selected typed item in place, `Save` copies it to the library) and saved
  signatures (`sigLib`, localStorage `myrograph.signatures.v1`, max 12; the New… dialog draws or types one, saves it and adds it). Typed text is never put in innerHTML.

## Working here
- Run: open `index.html`, or `python3 -m http.server` and visit localhost:8000.
- Test: `node tools/test.mjs` (extracts CORE, no browser). Visual checks: `tools/shot.sh`; phone-sized checks (real device emulation with touch): `node tools/mobile.mjs <driver.js> <out.png> [w h dpr]`.
- Git: commit directly to `main` - no feature branches or PRs. In a Conductor workspace (which starts on
  a placeholder branch) commit there, then land it with `git push origin HEAD:main`.
- Follow the user's global rules: header comment block on every source file, update `DEVLOG.md`
  at stopping points, and the cross-project journal at `~/Development/dev-journal/myrograph.md`.

## Gotchas / decisions worth knowing
- Name: "Spirograph" is a trademark, so nothing new is written under it: app id `myrograph`, PNG chunk `Myrograph`, localStorage
  `myrograph.*`, `.myroalbum.json`. The old names exist only in the `LEGACY` block in index.html and are only READ (old PNGs,
  album files and browser data still open; browser data is migrated once). Do not write the old names. If a takedown arrives,
  rename the repo/title (the README's trademark disclaimer stays).
- Privacy: commit with the GitHub noreply identity (already configured in the original clone).
  Never push commits authored with the user's personal or work email; check `git log --format=%ae`.
- Shaped-wheel sizes/holes are estimates from a photo (+/-0.5 tooth). The Cross rolls on a 60-tooth
  pitch circle with its real silhouette used only for collision/pictures. Combos that would
  physically collide (`p.ok` false) are never listed in the gallery; the part maker still shows them red.
- `fits()` has two modes: the original loose one (tolerance 0.4, 48 points) for the regular catalog, whose shaped wheels are estimated
  from a photo, and a strict two-sided one used whenever a custom part is in the pair (`pairFits`). Strict results are slow, so they
  are cached in localStorage (`myrograph.fits.v2`; bump the version if the check changes).
- A pattern's identity in the UI is `p.key` (index in ALL); anything persisted uses part ids
  (`track|roller|hole`) instead, so files survive PARTS edits.
- Headless Chrome screenshots taken after scrolling come out blank; verify scroll behavior via DOM.

- Animation: a layer has `spin` (turns per loop, tenths, limit +/-10, slider +/-5, positive = clockwise); `loopSec` (2-60 s, default 8) is global. The picture is a function of the
  loop phase = loops since the start (`layerAngle(l, phase)` in CORE): live playback (`animTick`, rAF) never wraps the phase, so decimal speeds have no seam; it only updates
  each existing line's rotation; edits rebuild the scene at `animPhase`. Save PNG captures the frame on screen (`bakeRot` -> whole-degree angles, spin kept); links/albums store
  phase 0. GIF (`makeGif`): one loop, or `loopMultiple(layers)` loops (1/2/5/10, so every layer is back where it started) when that is <= 600 frames, else one loop + a warning; the
  encoder (gifenc) is imported from the CDN only on export. SVG: every layer repeats on its own period (loop / |speed|), so any speed is seamless. Share link: layer field `s<speed>`
  (integers base 36 as before, tenths as decimals like `s1.5`), segment `loop,<s>`.
- Albums animate: `thumbRig` builds a saved setup's lines once, `thumbDraw` draws it at a loop phase; `thAnimTick` redraws the on-screen spinning thumbnails
  round-robin within a ~12 ms/frame budget (only in the albums view, not with prefers-reduced-motion); `renderThumb` is the static phase-0 draw.
- Theme: all UI colors are CSS variables (`:root` dark, `:root[data-theme=light]`); a <head> script sets `data-theme` before first paint (saved `myrograph.theme`,
  else the system setting). Canvases that draw UI colors (the part maker) read them through `themeColors()`. Don't hardcode UI colors: add a variable.
- Layers have their own ids (`newLayerKey`, 'L1'...), NOT the pattern key: the same pattern can be added many times (`addLayer` / `removeLayer` / `reorderLayers`).
  `ovCache` (pattern key -> geometry + points) is shared by duplicates (`releaseCurve` frees it when the last user goes). The layer Map's order is the list order
  AND the drawing order (later draws on top; makeLines creates materials in that order). Tiles have no selected state; a click adds a layer (and flashes the tile).
- Export formats: PNG (static, embeds the setup), GIF (`makeGif`, gifenc from the CDN), animated SVG (`makeSvg`: one scaled path per layer, `<animateTransform>` rotate,
  SVG angles are the negative of three.js's). Collapsible filter rows (`applyCollapse`) work on a row's direct children; give one the class `nofold` to keep it visible.
- Draw: a layer's `draw` (tenths, limit 10, slider 0..5) = pen draws per loop; `drawFraction(l, phase)` (CORE) is the cycle: 0 -> finished over each cycle, then the next starts instantly (no hold);
  at exact whole cycles (phase 0) it is the finished shape, so static views never show an empty layer. The pen is constant speed by ARC LENGTH (`cumLengths` / `drawCount` -> `instanceCount`
  of the Line2 geometry, set per line in an `onBeforeRender` override because duplicate layers share one geometry). `setLineFrame` is the one place that moves a built line to a phase
  (live tick, GIF frames, album thumbnails). SVG: `pathLength="1"` + dash offset `<animate>` (`drawAttrs`). Link field `d<speed>`.
- Printing: `startPrint` (the Print button and Ctrl/Cmd+P) asks via `<dialog id="pr">` whether to print on white when the paper is not `isNearWhite`; the choice is `printWhite` for that print only
  (reset on afterprint) and `fillPrintCanvas` swaps the render background and the auto-ink paper for it - the stored paper is never touched. File > Print goes straight to `beforeprint` (paper color).
- Spelling: American English everywhere (color, center, normalized, behavior, labeled ...), in code comments, UI text and docs.
- Canvas shape: `canvasDim` {w, h} (CORE `cleanCanvas`, default {1,1} = square, not written to files; `cv,<w>,<h>` link segment; `canvas` in saved state; 6:1 limit). The overlay scene is 2 units tall and 2a wide
  (a = w/h): `ovCam` / `camFor(a)` (the grid tiles keep the square `camera`), layers fit the shorter side (`0.92 * min(1, a)`), a layer's X / Y shift is thousandths of the WIDTH on both axes
  (`position = dx * a / 500`), text / signature x / y are shares of width / height. `exportDims(canvas, longEdge)` gives pixel sizes (PNG / GIF / SVG / print / thumbnails; "Exact" export only for a typed
  Custom size >= 100 px). #ovwrap's CSS aspect-ratio (`--ar`) sets the live shape; #ovc is absolutely positioned so its own size can't override it. Don't assume a square picture.
- Phone layout (`@media (max-width: 760px)` + `phoneMQ` / `isPhone()`): Compose is a 100vw x 100dvh editor (Back = `#ov-close`'s `.bk`); with it closed and layers present on the Patterns view the preview bar `#pip` shows
  (`pipSync`, `pipDraw` copies the live `#ovc` + `#sigc` canvases; `overlayLive()` = editor open OR bar showing, so rendering / animation run for both); a tile tap adds a layer (desktop: also opens the overlay). `minTile()` gives
  two columns; the filters start folded and show a count; only the active layer row shows X/Y and sliders; `(pointer: coarse)` also gets 40 px controls and `!important` 16 px inputs (iOS focus zoom).
- Phone filters: each `header details > .row` gets a `.row-sum` (what is chosen, `rowSummary` / `updateRowSummaries`) and a `.sheet-head` (`initFilterSheets`); tapping a row adds `.sheet-open` (CSS: fixed, full screen, all chips, no "+N more").
  The same DOM as desktop (the Ink row now contains `#pal-edit`); CSS hides the extras on wide screens. Part maker: `#pm-msg` lives in the sticky header and shows `edStatus()` = the fading note, else why saving is blocked, else bad pen holes.
- Sync / backup: everything syncable is a *record* `kind:id` (album, item, sig, pal, part; `collectLocal()` builds them from the unchanged stores, `applyRemote()` writes them back quietly and refreshes the UI). CORE `syncMerge({local, meta, remote, now})` is the whole
  algorithm and is pure: edits are found by hashing (`syncHash` of `stableStringify`), `meta` (localStorage `myrograph.sync.meta.v1`) remembers { h, u, d } per key, the newest `u` wins, a deletion is a tombstone record (kept 180 days), ties: deletion, then larger hash.
  A provider = `{ read() -> { records } | null, write({ v, app, records }) }`; `syncWith(provider)` runs one round (skips while the part maker is open). Backup = `makeBackup` / `readBackup` / `restoreBackup` (merge, never deletes). Records are
  validated on the way in (`SYNC_KEY`, canon functions, `validState`, names as text). Don't add a store without adding it to `collectLocal` and `applyRemote`.
- Background sync scheduler (runs only while `syncProvider` is set via `syncEnable(provider)`): every store writer (`persist`, `saveSigs`, `persistPalettes`, `saveLibrary`) calls `syncKick()`; `applyRemote` sets `syncApplying` so its own writes don't. `syncRun` never overlaps
  (`syncAgain`), waits while offline or while the part maker is open, retries with `syncTiming.retry`, and stops on provider errors with `.auth` (status `signin`). Status (`syncState`, `renderSyncStatus`) drives the dot on the cloud button and the text in the Backup & sync dialog.
  No separate queue: pending edits are found by hashing at the next run. Timestamps: a changed record's `u` is max(now, previous seen + 1), so clock skew can't make old edits win.
- Google Drive provider (`googleDrive`, Client ID `GOOGLE_CLIENT_ID`, public by design; origins registered in the Google Cloud project: https://fantapop.github.io and http://localhost:8000): GIS token client in memory only (1 h tokens, no refresh token without a server), file `myrograph-sync.json` in `appDataFolder`
  (find oldest by name, PATCH to update, multipart POST to create, 404 recreates). Before each call `ensure(false)` tries a silent renewal (`prompt: 'none'` + `hint` = the email); if the browser blocks it (no user gesture) the run throws `.auth` -> status `signin` ("Sign in again" button, interactive `prompt: ''`).
  Remembered in localStorage: `sync.provider`, `sync.email`, `sync.file`; `initSync()` re-enables at start. Disconnect revokes, forgets, resets `syncMeta`. A damaged cloud file is never overwritten (status error). Everything coming from the cloud goes through `cleanRecords`.
  Tests stub `window.google` and `fetch` (see `.context/y6.js` in the dev notes: not in the repo); the real service has not been exercised by tests.
- Usage counts: the GoatCounter `<script data-goatcounter=...>` in <head> counts page views (visitors, referrers, screens, countries; the #fragment is not sent, localhost and localStorage `skipgc='t'` are ignored). `track(name, {once})` sends events
  (queued until the script loads); names so far: `overlay/started` (once per visit), `overlay/created` + `overlay/created-<png|gif|svg|album|link|print>`, `visit/new` / `visit/returning` (`trackVisit`, a date kept in localStorage). RULE: an event is only a fixed name,
  never user content, text, colors or links. Anything new gets listed in the README privacy section if it changes what is counted.

