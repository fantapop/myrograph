# myrograph

A browser-only gallery and composer for gear-curve patterns (hypotrochoids and epitrochoids) drawn
by toothed rings, wheels and shaped pieces rolling around each other, using the tooth counts and
pen-hole layouts of a Deluxe-style set. No build step, no server: open `index.html`.

- Browse and filter thousands of ring/wheel/shape/pen-hole combinations (rendered with three.js,
  only the tiles on screen are drawn).
- **Compose** several patterns into one overlay (shared centre; per-layer color, rotation, size).
- **Save** an overlay as a PNG with its setup embedded, and re-import it later to keep editing.
- Keep named **albums** in the browser (localStorage), export/import them as files.
- **Sign** a piece: type your name in a handwriting-style font or draw it by hand, keep a list of signatures, and place one on the overlay
  (drag it, resize it, recolor it). It is saved with the PNG, album item and share link, and appears in prints.
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
