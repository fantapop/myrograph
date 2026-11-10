# myrograph

A browser-only gallery and composer for gear-curve patterns (hypotrochoids and epitrochoids) drawn
by toothed rings, wheels and shaped pieces rolling around each other, using the tooth counts and
pen-hole layouts of a Deluxe-style set. No build step, no server: open `index.html`.

- Browse and filter thousands of ring/wheel/shape/pen-hole combinations (rendered with three.js,
  only the tiles on screen are drawn).
- **Backup & restore** one file with all your albums, signatures, palettes and custom parts (the groundwork for syncing between devices).
- **Works on phones**: the overlay is a full-screen editor, and while you browse patterns a small live preview bar keeps it in view (tap a pattern to add it).
- **Compose** several patterns into one overlay on a canvas of your choice (square, wide, tall, Letter / A4 or a custom pixel size) (per-layer color, rotation, size, X/Y shift, spin, pen-draw) and export an animated GIF or SVG (saved albums animate too); light and dark UI themes.
- **Save** an overlay as a PNG with its setup embedded, and re-import it later to keep editing.
- Keep named **albums** in the browser (localStorage), export/import them as files.
- **Text & signatures**: type text straight onto the overlay (choose a font, edit it in place, no saving needed), or draw a signature by hand and keep it in a list to reuse; put several on the overlay
  (drag, resize, recolor each). They are saved with the PNG, album item and share link, and appear in prints and exports.
- **Print** the overlay with the Print button or Ctrl/Cmd+P (with the Compose panel open): just the picture, scaled to the page.
- **Share** an overlay as a link: the data lives in the URL fragment.
- **Make your own wheel**: the *Custom parts* filter row opens a shape maker. Drag handles (with
  symmetry and mirror) or start from a preset, set the size in teeth, place pen holes, and watch which
  pieces of the set it fits with while you edit (green fits, red would overlap) next to an animated roll
  preview. Custom parts live in their own filter, are saved in your browser, and travel inside saved
  PNGs, albums and share links, so others can open your overlays without having made the part.

## Run

Open `index.html` in a browser (needs network for the three.js CDN), or run
`python3 -m http.server` here and visit <http://localhost:8000>. The page is also hosted at
<https://fantapop.github.io/myrograph/> (GitHub Pages, from `main`); share links only work for others
when copied from that address, not from a `file://` or `localhost` copy.

## Notes

`DEVLOG.md` has the design notes, decisions and next steps. Part sizes for the shaped wheels are
estimates measured from a photo, not official specifications.

Not affiliated with or endorsed by the owner of the Spirograph® trademark. Spirograph is a
registered trademark of its owner; it is mentioned here only to describe what the curves resemble.

Licensed under the MIT License (see `LICENSE`).
