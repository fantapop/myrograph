# myrograph

A browser-only gallery and composer for gear-curve patterns (hypotrochoids and epitrochoids) drawn
by toothed rings, wheels and shaped pieces rolling around each other, using the tooth counts and
pen-hole layouts of a Deluxe-style set. No build step, no server: open `index.html`.

- Browse and filter thousands of ring/wheel/shape/pen-hole combinations (rendered with three.js,
  only the tiles on screen are drawn).
- **Compose** several patterns into one overlay (shared centre; per-layer color, rotation, size).
- **Save** an overlay as a PNG with its setup embedded, and re-import it later to keep editing.
- Keep named **albums** in the browser (localStorage), export/import them as files.
- **Share** an overlay as a link: the data lives in the URL fragment.

## Run

Open `index.html` in a browser (needs network for the three.js CDN), or run
`python3 -m http.server` here and visit <http://localhost:8000>. Share links only work for others
once the page is hosted somewhere.

## Notes

`DEVLOG.md` has the design notes, decisions and next steps. Part sizes for the shaped wheels are
estimates measured from a photo, not official specifications.

Not affiliated with or endorsed by the owner of the Spirograph® trademark. Spirograph is a
registered trademark of its owner; it is mentioned here only to describe what the curves resemble.
