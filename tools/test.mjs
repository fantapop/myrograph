// tools/test.mjs — node checks for the pure-math CORE block of index.html (no browser needed).
//
// Role: index.html is a single file, so this script extracts the code between the
// "BEGIN CORE" / "END CORE" markers, writes it to a temp .mjs, imports it, and asserts:
//   - rolling math matches closed-form hypo/epitrochoid ranges and the curves close
//   - the parts catalog (hole counts from the Deluxe set photo, Cross fits in the 96 ring)
//   - PNG text-chunk and share-link encoders round-trip, and reject malformed input
//   - ink palettes: presets are well-formed; saved custom palettes are sanitized on load
// Usage: node tools/test.mjs   (exit code 0 = all passed). Takes a few seconds.
// If you add exports to CORE, add them to the export list below.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { pathToFileURL, fileURLToPath } from 'url';

const html = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
const core = html.slice(html.indexOf('BEGIN CORE'), html.indexOf('END CORE'));
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'myrograph-')), 'core.mjs');
fs.writeFileSync(tmp, '//' + core.slice(core.indexOf('\n') - 0) + '\nexport { PARTS, makeOutline, circleDense, trace, buildCatalog, TAU, addTextChunk, readTextChunk, crc32, encodeShare, decodeShare, PRESET_PALETTES, cleanPalette, parsePalettes };\n');
const C = await import(pathToFileURL(tmp).href);

let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? '  ' + extra : ''}`); if (!ok) failed++; };

// rolling math: radial range of the pen path vs closed form, and closure
for (const [NF, NG, inside, frac] of [[96, 40, true, 0.6], [144, 40, false, 0.7], [105, 63, true, 0.5]]) {
  const F = C.makeOutline(C.circleDense(), NF), G = C.makeOutline(C.circleDense(), NG);
  const R = NF / C.TAU, r = NG / C.TAU, d = r * frac, pts = C.trace(F, G, inside, [d, 0]);
  let mn = 1e9, mx = 0; for (let i = 0; i < pts.length; i += 3) { const h = Math.hypot(pts[i], pts[i + 1]); mn = Math.min(mn, h); mx = Math.max(mx, h); }
  const base = inside ? R - r : R + r, want = (base - d) / (base + d), gap = Math.hypot(pts[0] - pts.at(-3), pts[1] - pts.at(-2));
  check(`ring ${NF} ${inside ? 'inside' : 'outside'} wheel ${NG}`, Math.abs(mn / mx - want) < 1e-3 && gap < 1e-3, `min/max ${(mn / mx).toFixed(4)} vs ${want.toFixed(4)}, closing gap ${gap.toExponential(1)}`);
}

// catalog
const cat = C.buildCatalog(), ok = cat.combos.filter(c => c.ok);
check('catalog builds', cat.combos.length > 7000, `${cat.combos.length} combos, ${ok.length} physically valid`);
const holes = id => cat.rollers.find(r => r.id === id).holes.length;
check('round wheel hole counts match the photo', JSON.stringify(C.PARTS.wheels.map(w => holes('w' + w))) === JSON.stringify([5, 8, 9, 13, 14, 16, 17, 19, 21, 23, 25, 29, 31, 33, 35]));
check('shaped wheel hole counts (Eye 13, Bar 9, Triangle 12, Cross 10)', [holes('eye'), holes('bar'), holes('triangle'), holes('cross')].join() === '13,9,12,10');
check('Cross fits inside the 96 ring', ok.some(c => c.roller.id === 'cross' && c.track.id === 'ring96-in'));

// PNG metadata (synthetic PNG: signature + IHDR + IDAT + IEND; the chunk code only needs the structure)
const chunk = (type, data) => { const b = new Uint8Array(12 + data.length), dv = new DataView(b.buffer); dv.setUint32(0, data.length); b.set(new TextEncoder().encode(type), 4); b.set(data, 8); dv.setUint32(8 + data.length, C.crc32(b.subarray(4, 8 + data.length))); return b; };
const parts = [Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), chunk('IHDR', new Uint8Array(13)), chunk('IDAT', Uint8Array.of(1, 2, 3)), chunk('IEND', new Uint8Array(0))];
const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { png.set(p, o); o += p.length; }
const text = JSON.stringify({ note: 'héllo ✓' }), withMeta = C.addTextChunk(png, 'K', text);
check('crc32 check value', C.crc32(new TextEncoder().encode('123456789')) === 0xcbf43926);
check('PNG text chunk round-trips', C.readTextChunk(withMeta, 'K') === text && C.readTextChunk(png, 'K') === null && C.readTextChunk(withMeta, 'Other') === null);

// share links
const st = { app: 'spirograph-gallery', v: 1, paper: '#faf7f0', baseScale: 'fit', layers: [
  { track: 'ring96-in', roller: 'cross', hole: 1, color: '#1f4fd8', visible: true, rot: 0, size: 100 },
  { track: 'ring144-out', roller: 'eye', hole: 6, color: '#c4242b', visible: false, rot: 40, size: 70 }] };
check('share link round-trips', JSON.stringify(C.decodeShare('#' + C.encodeShare(st))) === JSON.stringify(st));
const rejects = ['v2/faf7f0/t', 'v1/zzzzzz/t', 'v1/faf7f0/t/a,b,x,1f4fd8,1,0,100', 'v1/faf7f0/t/a b,c,1,1f4fd8,1,0,100', 'junk'].every(b => { try { C.decodeShare(b); return false; } catch { return true; } });
check('malformed share links are rejected', rejects);

// ink palettes
check('preset palettes are valid and uniquely named', C.PRESET_PALETTES.every(p => C.cleanPalette(p)) && new Set(C.PRESET_PALETTES.map(p => p.id)).size === C.PRESET_PALETTES.length);
const saved = [{ id: 'u-1', name: ' Mine ', colors: ['#ABCDEF', 'red', '#123456'], paper: '#101010' }, { id: 'u-4', name: 'Bad paper', colors: ['#000000'], paper: 'black' }, { id: 'bad id', name: 'x', colors: ['#000000'] }, { id: 'u-2', name: '', colors: ['#000000'] }, { id: 'u-3', name: 'none', colors: ['nope'] }, null, 7];
check('custom palettes are sanitized on load', JSON.stringify(C.parsePalettes(JSON.stringify(saved))) === JSON.stringify([{ id: 'u-1', name: 'Mine', colors: ['#abcdef', '#123456'], paper: '#101010' }, { id: 'u-4', name: 'Bad paper', colors: ['#000000'] }]));
check('dark presets carry a paper color', C.PRESET_PALETTES.filter(p => p.paper).map(p => p.id).join() === 'neon,midnight,chalk');
check('corrupt palette storage gives an empty list', C.parsePalettes('{oops').length === 0 && C.parsePalettes(null).length === 0 && C.parsePalettes('{"a":1}').length === 0);

console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
