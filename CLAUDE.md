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
  (`k` x `n` handles, optional mirror), perimeter scaled to `N` teeth; holes in quarter-tooth ints. `pc: 1` = pitch-circle part
  (`makePitchPart`): rolls on a circle of `N` teeth, the outline is only the body (tips touch the circle, notches can be deep),
  `roller.o` is the circle and `roller.body` the silhouette, `teethOn` says which teeth exist; pen curves equal a round wheel's.
  Ids are `c` + hash of the content, so a part is immutable: editing makes a new id and saved things
  keep their own copy of the definition (`parts` in PNG/album state, `p,...` segments in share links).
  `library` (localStorage) is what the user made/kept; `registry` also holds guest parts from opened
  files. Custom combos live in `CUSTOM`, never in `ALL` (own filter row). Part names are sanitized
  (`cleanName`) because they go into innerHTML.

## Working here
- Run: open `index.html`, or `python3 -m http.server` and visit localhost:8000.
- Test: `node tools/test.mjs` (extracts CORE, no browser). Visual checks: `tools/shot.sh`.
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
- Headless Chrome screenshots taken after scrolling come out blank; verify scroll behaviour via DOM.
