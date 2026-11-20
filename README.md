# myrograph

A web page for browsing and combining gear-curve patterns, the kind a Spirograph draws. It uses the
tooth counts and pen-hole layouts of a Deluxe-style set. Nothing to install: open
<https://fantapop.github.io/myrograph/>.

## Features

- Browse thousands of patterns made from the rings, wheels and pen holes of the set, and filter by piece.
- Stack patterns into one picture. Each layer has its own color, rotation, size, line width and position.
  You can add the same pattern more than once and reorder the layers.
- Animate a layer by spinning it, or by having a pen draw it out.
- Choose the canvas shape: square, wide, tall, Letter, A4 or a custom size.
- Add text and signatures, typed or drawn by hand.
- Design your own wheels and see which pieces of the set they fit with.
- Save a picture as a PNG (the setup is stored inside, so you can open it again and keep editing), an
  animated GIF or an animated SVG, or print it.
- Share a picture as a link.
- Keep albums of your pictures.
- Back everything up to a file, or sync between your devices through your own Google Drive.
- Light and dark themes, and a layout for phones.

## Running it

Open `index.html` in a browser (it loads three.js from a CDN, so it needs a network connection), or
run `python3 -m http.server` in this folder and go to <http://localhost:8000>. Share links only work
for other people when they come from the hosted address above, not from a local copy.

## About the code

All of the code in this project was written by Claude, an AI model made by Anthropic, working from
my directions. It's one HTML file with no build step. `DEVLOG.md` has the design notes and decisions.

The sizes of the shaped wheels are estimates measured from a photo, not official specifications.

## Privacy

Your albums and other saved things stay in your browser, and in your own Google Drive if you turn on
sync. There is no Myrograph server. Visits and a few actions, like saving a picture, are counted
anonymously with [GoatCounter](https://www.goatcounter.com). It uses no cookies, collects no personal
data and never sees what you make. The sync dialog has a box to turn the counting off for your browser.

## Legal

Not affiliated with or endorsed by the owner of the Spirograph® trademark. Spirograph is a
registered trademark of its owner; it is mentioned here only to describe what the curves resemble.

Licensed under the MIT License (see `LICENSE`).
