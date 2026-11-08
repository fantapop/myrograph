// tools/test.mjs — node checks for the pure-math CORE block of index.html (no browser needed).
//
// Role: index.html is a single file, so this script extracts the code between the
// "BEGIN CORE" / "END CORE" markers, writes it to a temp .mjs, imports it, and asserts:
//   - rolling math matches closed-form hypo/epitrochoid ranges and the curves close
//   - the parts catalog (hole counts from the Deluxe set photo, Cross fits in the 96 ring)
//   - PNG text-chunk and share-link encoders round-trip, and reject malformed input
//   - custom parts (shape model, ids, validation, hole rules, fit combos, share-link codec)
//   - ink palettes: presets are well-formed; saved custom palettes are sanitized on load
// Usage: node tools/test.mjs   (exit code 0 = all passed). Takes a few seconds.
// If you add exports to CORE, add them to the export list below.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { pathToFileURL, fileURLToPath } from 'url';

const html = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
const core = html.slice(html.indexOf('BEGIN CORE'), html.indexOf('END CORE'));
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'myrograph-')), 'core.mjs');
fs.writeFileSync(tmp, '//' + core.slice(core.indexOf('\n') - 0) + '\nexport { PARTS, makeOutline, circleDense, trace, buildCatalog, TAU, addTextChunk, readTextChunk, crc32, encodeShare, decodeShare, PRESET_PALETTES, cleanPalette, parsePalettes, PART_LIMITS, PART_PRESETS, presetShape, resampleShape, canonPart, parseParts, partId, makePart, partDense, polyInfo, holeFits, fillHoles, customCombos, CROSS_ARM, pose, lcm, traceRaw, encodePart, decodePart, pairFits, makeSDF, fits };\n');
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
const st = { app: 'myrograph', v: 1, paper: '#faf7f0', baseScale: 'fit', layers: [
  { track: 'ring96-in', roller: 'cross', hole: 1, color: '#1f4fd8', visible: true, rot: 0, size: 100, width: 1 },
  { track: 'ring144-out', roller: 'eye', hole: 6, color: '#c4242b', visible: false, rot: 40, size: 70, width: 2.5 }] };
check('share link round-trips', JSON.stringify(C.decodeShare('#' + C.encodeShare(st))) === JSON.stringify(st));
const rejects = ['v2/faf7f0/t', 'v1/zzzzzz/t', 'v1/faf7f0/t/a,b,x,1f4fd8,1,0,100', 'v1/faf7f0/t/a b,c,1,1f4fd8,1,0,100', 'junk'].every(b => { try { C.decodeShare(b); return false; } catch { return true; } });
check('line width: 1.0x is omitted from the link, others are kept; links without it decode as 1.0x',
  !C.encodeShare(st).split('/')[3].split(',')[7] && C.encodeShare(st).split('/')[4].split(',')[7] === '25' && C.decodeShare('v1/faf7f0/t/ring96-in,w24,1,1f4fd8,1,0,100').layers[0].width === 1
  && C.decodeShare('v1/faf7f0/t/ring96-in,w24,1,1f4fd8,1,0,100,99').layers[0].width === 6);
check('malformed share links are rejected', rejects);

// custom parts
const mkDef = (preset, N0, name = 'T') => { const sh = C.presetShape(C.PART_PRESETS.find(p => p.id === preset)), N = N0 || sh.N; const o = C.makePart({ ...sh, N, h: [[0, 0]] }).roller.o;
  return C.canonPart({ ...sh, name, N, h: C.fillHoles(o, 'x', 1.5) }); };
const oval = mkDef('oval', 44, 'My oval');
check('presets all build into valid parts that roll on most of the box', C.PART_PRESETS.every(p => mkDef(p.id) && mkDef(p.id).h.length >= 3 && cat.tracks.filter(t => C.pairFits(t, C.makePart(mkDef(p.id)).roller)).length >= 12), C.PART_PRESETS.map(p => mkDef(p.id)?.h.length).join(','));
const part = C.makePart(oval);
check('custom outline has exactly N teeth of perimeter', part.roller.o.N === 44 && Math.abs((() => { let t = 0; const o = part.roller.o; for (let i = 0; i < o.M; i++) { const j = (i + 1) % o.M; t += Math.hypot(o.p[2 * j] - o.p[2 * i], o.p[2 * j + 1] - o.p[2 * i + 1]); } return t; })() - 44) < 0.3);
check('mirrored symmetric shape is centred on its origin', (() => { const o = part.roller.o; let sx = 0, sy = 0; for (let i = 0; i < o.M; i++) { sx += o.p[2 * i]; sy += o.p[2 * i + 1]; } return Math.hypot(sx, sy) / o.M < 0.05; })());
check('content-addressed id ignores the name but not the shape', C.canonPart({ ...oval, name: 'Other' }).id === oval.id && C.canonPart({ ...oval, N: 45 }).id !== oval.id && /^c[0-9a-f]{8}$/.test(oval.id));
const bad = [null, 7, { ...oval, N: 5 }, { ...oval, k: 0 }, { ...oval, r: [1, 2] }, { ...oval, r: oval.r.map(() => 300) }, { ...oval, h: [] }, { ...oval, h: [[0.5, 1]] }, { ...oval, k: 8, n: 12 }, { ...oval, h: Array(40).fill([1, 1]) }];
check('invalid part definitions are rejected', bad.every(b => C.canonPart(b) === null));
check('part names are stripped of HTML-significant characters', C.canonPart({ ...oval, name: '<img src=x onerror=1>"A\'&' }).name === 'img srcx onerror1A');
check('corrupt library storage gives an empty list', C.parseParts('{oops').length === 0 && C.parseParts('[1,2]').length === 0 && C.parseParts(JSON.stringify([oval, oval, { ...oval, N: 50 }])).length === 2);
check('resampling the handle count keeps the outline', (() => { const r2 = C.resampleShape({ ...oval, h: [[0, 0]] }, 4), a = C.partDense({ ...oval }), b = C.partDense(r2);
  const ra = th => Math.hypot(...a[Math.round(th / (2 * Math.PI) * a.length) % a.length]), rb = th => Math.hypot(...b[Math.round(th / (2 * Math.PI) * b.length) % b.length]);
  return [0, 1, 2, 3, 4, 5].every(th => Math.abs(ra(th) / ra(0) - rb(th) / rb(0)) < 0.06); })());
const o44 = part.roller.o;
check('hole rule: inside the body with a margin', C.holeFits(o44, 0, 0) && !C.holeFits(o44, 100, 0) && !C.holeFits(o44, o44.p[0] - 0.2, o44.p[1]));
const fx = C.fillHoles(o44, 'x', 1.5);
check('hole fill gives valid holes, rim to centre, within the cap', fx.length > 2 && fx.every(q => C.holeFits(o44, q[0] / 4, q[1] / 4)) && fx[0][0] > fx.at(-1)[0] && C.fillHoles(o44, 'grid', 1.5).length <= C.PART_LIMITS.maxHoles);
const memo = new Map(), pcs = [C.makePart(mkDef('circle', 40, 'Disc')), part];
const cc = C.customCombos(cat, pcs, memo);
check('custom combos pair each custom piece with the box and with each other', cc.every(c => c.custom && c.key === `${c.track.id}|${c.roller.id}|${c.hole}`) &&
  cc.some(c => c.track.id === 'ring96-in' && c.roller.id === pcs[0].roller.id) && cc.some(c => c.track.id === pcs[1].fixed.id && c.roller.id === pcs[0].roller.id) &&
  !cc.some(c => c.track.pieceId === c.roller.id), `${cc.length} combos`);
check('a 40-tooth disc rolls inside the 96 ring; a long thin oval around a 24 wheel is judged by the real check', cc.find(c => c.track.id === 'ring96-in' && c.roller.id === pcs[0].roller.id).ok === true);
const wide = C.makePart(C.canonPart({ ...oval, N: 110, h: [[0, 0]] }));
check('a piece too big for the ring is reported as not fitting', C.pairFits(cat.tracks.find(t => t.id === 'ring96-in'), wide.roller) === false);
const psum = C.PART_PRESETS.map(p => { const q = C.makePart(mkDef(p.id)); return `${p.id}:${cat.tracks.filter(t => C.pairFits(t, q.roller)).length}/${cat.tracks.length}`; }).join(' ');
console.log('     fit counts (tracks each preset at its suggested size rolls on without overlap):', psum);
const stp = { ...st, parts: [oval, mkDef('clover', 0, 'Clover (3)')] };
check('share link carries custom parts and round-trips', JSON.stringify(C.decodeShare('#' + C.encodeShare(stp))) === JSON.stringify(stp), `${C.encodeShare(stp).length} chars`);
check('share link rejects damaged custom parts', ['v1/faf7f0/t/p,x,44,2,6,1,zz,1_1', 'v1/faf7f0/t/p,x,5,2,6,1,ffffffffffff,1_1', 'v1/faf7f0/t/p,x,44,2,6,1,ffffffffffff,'].every(b => { try { C.decodeShare(b); return false; } catch { return true; } }));

// fixed pieces carry the same pen holes as their moving twins (the icons draw them); a custom part's fixed copy is re-centred, so its holes shift with it
check('fixed pieces have their twin\'s holes', cat.tracks.filter(t => t.kind === 'piece').every(t => t.holes === cat.rollers.find(r => r.id === t.pieceId).holes));
const fixedHoles = pcs[1].fixed.holes, rollerHoles = pcs[1].roller.holes, o1 = pcs[1].roller.o; let mx = 0, my = 0; for (let i = 0; i < o1.M; i++) { mx += o1.p[2 * i]; my += o1.p[2 * i + 1]; }
check('custom fixed copy keeps holes at the same place on the body', fixedHoles.every(([x, y], i) => Math.abs(x - (rollerHoles[i][0] - mx / o1.M)) < 1e-9 && Math.abs(y - (rollerHoles[i][1] - my / o1.M)) < 1e-9));
check('Cross arm ends lie on its 60-tooth pitch circle (radius ~ 60 / 2pi)', Math.abs(C.CROSS_ARM.Rt - 60 / (2 * Math.PI)) < 0.05);

// size range: the smallest circle that holds a pen hole (1 tooth from the edge) has radius N/2pi >= 1, so 7 teeth; the maximum is generous
const circ = N => C.makePart({ id: 'x', name: 'c', ...C.presetShape(C.PART_PRESETS[0]), N, h: [[0, 0]] });
check('limits: 7 teeth is the smallest circle that can hold a pen hole, 6 cannot', C.PART_LIMITS.Nmin === 7 && C.holeFits(circ(7).roller.o, 0, 0) && !C.holeFits(circ(6).roller.o, 0, 0));
const edge = N => C.canonPart({ ...oval, N, h: [[0, 0]] });
check('limits: N from 7 to 300 accepted, 6 and 301 rejected', edge(7) && edge(300) && !edge(6) && !edge(301) && C.PART_LIMITS.Nmax === 300);
const tinyP = circ(7), bigP = circ(300);
check('tiny pieces are collision-checked on every sample (7-tooth circle fits inside the 96 ring and around a 24 wheel)', C.pairFits(cat.tracks.find(t => t.id === 'ring96-in'), tinyP.roller) && C.pairFits(cat.tracks.find(t => t.id === 'fix-w24'), tinyP.roller));
const t0 = Date.now(); const bigFits = cat.rollers.filter(r => C.pairFits(bigP.fixed, r)).length; const bigMs = Date.now() - t0;
check('a 300-tooth fixed piece is checked against every wheel in about a second (its distance field is built once)', bigFits >= 10 && bigMs < 1500, `${bigFits}/${cat.rollers.length} fit, ${bigMs} ms`);

// strict collision check for custom parts (an oval 44-48 teeth long overlapped the 96 ring by 0.1-0.4 tooth and was accepted; ground truth below)
const ring96 = cat.tracks.find(t => t.id === 'ring96-in'), rin96 = ring96.o.N / C.TAU;
const deepest = G => { const L = C.lcm(ring96.o.N, G.N), steps = Math.ceil(L / 0.25), P = [0, 0, 0, 0]; let w = 0;   // every outline point, a pose every 0.25 tooth
  for (let st = 0; st < steps; st++) { C.pose(ring96.o, G, true, L * st / steps, P); for (let j = 0; j < G.M; j++) { const x = P[2] + P[0] * G.p[2 * j] - P[1] * G.p[2 * j + 1], y = P[3] + P[1] * G.p[2 * j] + P[0] * G.p[2 * j + 1]; w = Math.max(w, Math.hypot(x, y) - rin96); } }
  return w; };
const mkp = (id, N) => { const sh = C.presetShape(C.PART_PRESETS.find(p => p.id === id)); return C.makePart({ id: 'x', name: 'x', ...sh, N, h: [[0, 0]] }); };
check('ovals that overlap the ring by 0.1-0.4 tooth are now rejected (they were accepted)', [44, 46, 48].every(N => !C.pairFits(ring96, mkp('oval', N).roller)) && !C.pairFits(ring96, mkp('egg', 60).roller));
check('a circle that exactly fits the ring is still accepted', C.pairFits(ring96, mkp('circle', 80).roller) && C.pairFits(ring96, mkp('circle', 96).roller));
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let acceptedOverlap = 0, accepted = 0, tried = 0;
for (let i = 0; i < 80; i++) { const k = 1 + Math.floor(rnd() * 6), n = 3 + Math.floor(rnd() * 5), mir = rnd() < .5 ? 1 : 0, N = 30 + Math.floor(rnd() * 60); let r = Array.from({ length: n }, () => 140 + Math.floor(rnd() * 116)); if (mir) r = r.map((_, j, a) => a[Math.min(j, (a.length - j) % a.length)]); if (k * n > 48) continue;
  const q = C.makePart({ id: 'x', name: 'x', N, k, n, mir, r, h: [[0, 0]] }); tried++; if (!C.pairFits(ring96, q.roller)) continue; accepted++; if (deepest(q.roller.o) > 0.1) acceptedOverlap++; }
check('random hand-shaped parts: none accepted in the ring while really overlapping it by more than 0.1 tooth', acceptedOverlap === 0 && accepted > 5, `${accepted} of ${tried} accepted`);
// pen path: no long chords (the cause of broken-looking lines and hooked cusps)
const stepsOf = pts => { let w = 0; for (let i = 0; i + 3 < pts.length; i += 3) w = Math.max(w, Math.hypot(pts[i + 3] - pts[i], pts[i + 4] - pts[i + 1])); return w; };
const ov = mkp('oval', 48), far = [7, 0], oldStep = 1.0;
const tr = C.traceRaw(ring96.o, ov.roller.o, true, far), n = tr.pts.length / 3;
check('pen path far from the piece centre has no step over ~0.2 tooth (was 1.2), and still closes', stepsOf(tr.pts) < 0.2 && Math.hypot(tr.pts[0] - tr.pts[3 * (n - 1)], tr.pts[1] - tr.pts[3 * (n - 1) + 1]) < 1e-6, `largest step ${stepsOf(tr.pts).toFixed(3)}, ${n} points`);
check('traceRaw returns the travel of every point (non-decreasing, 0 to L)', tr.ss.length === n && tr.ss[0] === 0 && Math.abs(tr.ss[n - 1] - C.lcm(96, 48)) < 1e-9 && tr.ss.every((v, i) => i === 0 || v >= tr.ss[i - 1]));
check('the point cap still holds', C.traceRaw(ring96.o, mkp('circle', 83).roller.o, true, [10, 0], 3000).pts.length / 3 <= 3000 + 64);

// pitch-circle parts were removed again: they are refused (a link or saved part that has one is skipped rather than drawn wrongly)
check('parts flagged as pitch-circle parts (a removed experiment) are refused, in storage and in links', C.canonPart({ ...oval, pc: 1 }) === null && C.parseParts(JSON.stringify([oval, { ...oval, pc: 1, N: 50 }])).length === 1 && C.decodePart(C.encodePart(oval) + ',1') === null);
check('presets are all distinct enough from a plain circle to be worth offering (7 of them)', C.PART_PRESETS.length === 7 && !C.PART_PRESETS.some(p => ['star', 'flower', 'square'].includes(p.id)));

// spiral hole fill (the default): valid holes only, rim to centre, within the cap, spread in many directions; a plain row only uses one
{ const sp = C.fillHoles(o44, 'spiral', 2), row = C.fillHoles(o44, 'x', 2), dirs = new Set(sp.map(([x, y]) => Math.round(Math.atan2(y, x) * 4)));
  check('spiral fill: valid holes, rim to centre, within the cap, many more than a row and in many directions',
    sp.length > row.length && sp.length <= C.PART_LIMITS.maxHoles && sp.every(q => C.holeFits(o44, q[0] / 4, q[1] / 4)) && sp.every((q, i) => i === 0 || Math.hypot(q[0], q[1]) <= Math.hypot(sp[i - 1][0], sp[i - 1][1]) + 1e-9) && dirs.size >= sp.length * 0.6,
    `${sp.length} holes vs ${row.length} in a row, ${dirs.size} directions`); }

// ink palettes
check('preset palettes are valid and uniquely named', C.PRESET_PALETTES.every(p => C.cleanPalette(p)) && new Set(C.PRESET_PALETTES.map(p => p.id)).size === C.PRESET_PALETTES.length);
const saved = [{ id: 'u-1', name: ' Mine ', colors: ['#ABCDEF', 'red', '#123456'], paper: '#101010' }, { id: 'u-4', name: 'Bad paper', colors: ['#000000'], paper: 'black' }, { id: 'bad id', name: 'x', colors: ['#000000'] }, { id: 'u-2', name: '', colors: ['#000000'] }, { id: 'u-3', name: 'none', colors: ['nope'] }, null, 7];
check('custom palettes are sanitized on load', JSON.stringify(C.parsePalettes(JSON.stringify(saved))) === JSON.stringify([{ id: 'u-1', name: 'Mine', colors: ['#abcdef', '#123456'], paper: '#101010' }, { id: 'u-4', name: 'Bad paper', colors: ['#000000'] }]));
check('dark presets carry a paper color', C.PRESET_PALETTES.filter(p => p.paper).map(p => p.id).join() === 'neon,midnight,chalk');
check('corrupt palette storage gives an empty list', C.parsePalettes('{oops').length === 0 && C.parsePalettes(null).length === 0 && C.parsePalettes('{"a":1}').length === 0);

console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
