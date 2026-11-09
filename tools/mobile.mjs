// tools/mobile.mjs - run a driver script against index.html in a phone-sized Chrome (real DevTools device emulation: mobile viewport + touch), and save a screenshot.
//
// Role: the visual / behavior check for the phone layout (full-screen overlay editor, preview bar, collapsed filters). Chrome's own --window-size can't go below ~500 px wide,
// which is why this talks to the DevTools protocol instead. Not part of the app; nothing reads its output but you.
//
// Usage:  node tools/mobile.mjs <driver.js> <out.png> [width height dpr]      (default 390 844 2; needs Google Chrome on macOS and Node 22+)
// The driver is plain page JavaScript, injected before the last </script> of index.html (so it can use the page's own functions and window.__myro). It prints lines starting
// "T> " with console.log, and must finish with console.log('T> DONE'); those lines are echoed here, and the page is screenshot when DONE (or after 60 s).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [drv, out, W = 390, H = 844, DPR = 2] = process.argv.slice(2);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.join(root, 'tools', '.scratch.html');      // (gitignored)
let s = fs.readFileSync(path.join(root, 'index.html'), 'utf8'); const i = s.lastIndexOf('</script>');
fs.writeFileSync(scratch, s.slice(0, i) + '\n' + fs.readFileSync(drv, 'utf8') + '\n' + s.slice(i));
const srv = spawn('python3', ['-m', 'http.server', '8767', '--directory', root], { stdio: 'ignore' });
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/mob-' + port, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cleanup = () => { try { chrome.kill(); srv.kill(); } catch {} };
process.on('exit', cleanup);
let target; for (let k = 0; k < 50 && !target; k++) { await sleep(200); try { target = (await (await fetch(`http://localhost:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(), logs = []; let done = false;
ws.onmessage = ev => { const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled') { const t = m.params.args.map(a => a.value ?? a.description).join(' '); if (/^T>/.test(t) || m.params.type === 'error') { console.log(t); if (/^T> DONE/.test(t)) done = true; } }
  if (m.method === 'Runtime.exceptionThrown') console.log('EXC', m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
globalThis.cdp = send;
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: +DPR, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.navigate', { url: 'http://localhost:8767/tools/.scratch.html' });
for (let k = 0; k < 240 && !done; k++) await sleep(250);
if (!done) console.log('T> (no DONE within 60 s)');
const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(out, Buffer.from(shot.data, 'base64')); console.log('written', out);
ws.close(); cleanup(); process.exit(0);
