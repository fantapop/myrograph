#!/bin/sh
# tools/shot.sh — screenshot the page with headless Chrome (macOS path) to check the UI visually.
#
# Role: manual visual verification helper; not used by anything else. Needs a local server:
#   python3 -m http.server 8765 &        # from the repo root
#   tools/shot.sh out.png "http://localhost:8765/index.html" [width height]
# Notes: uses software WebGL (swiftshader). Screenshots taken after scrolling come out blank in
# headless mode; to test scrolling, dump the DOM (--dump-dom) and inspect the tiles instead.
# To drive the page (click chips, open Compose...) copy index.html to a scratch file, append a
# setTimeout script before </script>, and load that. console.log output shows with
# --enable-logging=stderr --v=0 (grep CONSOLE).
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --window-size="${3:-1400},${4:-1000}" --virtual-time-budget=15000 --screenshot="$1" "$2" 2>&1 | grep -E "written"
