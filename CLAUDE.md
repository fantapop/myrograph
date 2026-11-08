# myrograph — handoff notes for a new session

Read `DEVLOG.md` first (Current state + dated log). This file is just the orientation.

## What it is
Single-file static web page, `index.html` (three.js from a CDN import map, no build, no server).
Gallery of gear-curve patterns from a Deluxe-style Spirograph-type set (see `README.md`), with an
overlay composer, PNG save with embedded setup, albums (localStorage + export/import) and
share-by-URL-fragment. Repo: https://github.com/fantapop/myrograph (private; public + GitHub Pages
not done yet - share links only work for others once hosted).

## Layout of index.html
- `PARTS` (top of the CORE block): tooth counts and hole layouts. Edit here to change the set.
- CORE block (`BEGIN CORE` ... `END CORE`): pure math, no DOM: outlines, rolling contact, collision
  check, PNG text chunks, share-link codec. Tested by `tools/test.mjs`.
- UI below it: filters, virtualized grid, offscreen WebGL -> per-tile 2D canvases, Compose panel
  (overlay), save/open, albums view, share links.

## Working here
- Run: open `index.html`, or `python3 -m http.server` and visit localhost:8000.
- Test: `node tools/test.mjs` (extracts CORE, no browser). Visual checks: `tools/shot.sh`.
- Follow the user's global rules: header comment block on every source file, update `DEVLOG.md`
  at stopping points, and the cross-project journal at `~/Development/dev-journal/myrograph.md`.

## Gotchas / decisions worth knowing
- Name: "Spirograph" is a trademark. Visible strings say myrograph; internal identifiers keep the
  old names on purpose (PNG chunk `SpirographGallery`, app id `spirograph-gallery`, localStorage
  `spirograph.*`, `.spiroalbum.json`) so existing files/links work. If renaming them, keep reading
  the old names. If a takedown arrives, rename the repo/title.
- Privacy: commit with the GitHub noreply identity (already configured in the original clone).
  Never push commits authored with the user's personal or work email; check `git log --format=%ae`.
- Shaped-wheel sizes/holes are estimates from a photo (+/-0.5 tooth). The Cross rolls on a 60-tooth
  pitch circle with its real silhouette used only for collision/pictures. Combos that would
  physically collide are hidden behind "Include overlapping combos".
- A pattern's identity in the UI is `p.key` (index in ALL); anything persisted uses part ids
  (`track|roller|hole`) instead, so files survive PARTS edits.
- Headless Chrome screenshots taken after scrolling come out blank; verify scroll behaviour via DOM.
