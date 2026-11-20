# Myrograph

Myrograph is a web toy for making geometric art from rolling gears, also known as
[roulette curves](https://en.wikipedia.org/wiki/Roulette_%28curve%29). It uses the
tooth counts and pen-hole layouts of a Deluxe-style set. Head here to jump right in: <https://fantapop.github.io/myrograph/>

Please use it, share it, have fun with it, and show it to your kids and see what they come up with.

## Inspiration

I had an entertaining 30 minutes playing with my 8-year-old son's new Spirograph set. As an adult, with brand new pens and a lot of patience, I was able to create a few of those perfect designs I was never really able to achieve as a child. The instruction manual includes a grid of various interesting patterns that you can make. The actual number of combinations seemed limitless, and it made me wonder if anyone had built a webpage that allowed you to browse and see them all. I couldn't find anything, so I decided to see what Claude could come up with. The first iteration was impressive, but we didn't stop there. We kept riffing on different feature ideas together. Over the next few days my son clocked hours on this thing and wanted to show everyone. While I don't want to undersell the benefits of doing physical things in this world and getting away from screens, I've got to say, Myrograph has a lot of benefits over its real-world counterpart. My favorite part was seeing how creative my son was using it.

## Features

- Browse thousands of patterns made from the rings, wheels and pen holes of the set, and filter by piece.
- Create art by stacking patterns onto a canvas. Each layer has its own color, rotation, size, line width and position. You can add the same pattern more than once and reorder the layers.
- Animate a layer by spinning it, or by having a pen draw it out.
- Choose the canvas shape: square, wide, tall, Letter, A4 or a custom size.
- Add text and signatures, typed or drawn by hand.
- Design your own parts.
- Save a picture as a PNG (the parameters are stored as metadata in the file as well, so you can open it from within Myrograph again and keep editing), an
  animated GIF, an animated SVG, or print it.
- Share a picture as a link.
- Keep albums of your pictures.
- Back everything up to a file, or sync between your devices through your own Google Drive.
- Light and dark themes, and a mobile-friendly layout.

## Running it

Open `index.html` in a browser (it loads three.js from a CDN, so it needs a network connection), or
run `python3 -m http.server` in this folder and go to <http://localhost:8000>.

## About the code

All of the code in this project was written by Claude and directed by a human. It's one HTML file with no build step. See `DEVLOG.md` for design notes, feature ideas and decisions.

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
