// Server-side SVG string renderer for the shield patch design.
// Mirrors the geometry from patch-render.js but outputs raw SVG strings
// instead of React elements, so it works in Node/CommonJS without React.

const BADGE_FONTS = require('./badge-fonts');

const FIR = "M0 0 L-3 0 L-3 -5 L-13 -5 L-4 -15 L-11 -15 L-3 -25 L-9 -25 L-2 -34 L-6 -34 L0 -44 L6 -34 L2 -34 L9 -25 L3 -25 L11 -15 L4 -15 L13 -5 L3 -5 L3 0 Z";
const BIRD = "M-22 0 C-12 -8 -4 -4 0 4 C4 -4 12 -8 22 0 C12 -2 4 2 0 8 C-4 2 -12 -2 -22 0 Z";
const SHIELD = "M300 64 C356 64 396 68 418 78 C432 84 436 100 452 108 C470 117 480 130 480 168 C480 250 478 300 470 360 C458 448 408 540 300 612 C192 540 142 448 130 360 C122 300 120 250 120 168 C120 130 130 117 148 108 C164 100 168 84 182 78 C204 68 244 64 300 64 Z";
const BASEY = 364;

function mix(hex, target, amt) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(target.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * amt), g = Math.round(ag + (bg - ag) * amt), bl = Math.round(ab + (bb - ab) * amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}
const lighten = (h, a) => mix(h, '#ffffff', a);
const darken  = (h, a) => mix(h, '#000000', a);

function estW(text, fs, factor, ls) { return text.length * fs * factor + Math.max(0, text.length - 1) * ls; }
function fitFont(text, base, max, factor, ls, min) {
  const w = estW(text, base, factor, ls);
  return w > max ? Math.max(min || 6, base * max / w) : base;
}

function treeXs(kind, layer) {
  const step = [26, 34, 52][layer], a = 92, b = 512;
  const xs = [];
  for (let x = a; x <= b; x += step) xs.push(x);
  if (kind === 'full') return xs;
  if (kind === 'clusters') { if (layer === 0) return xs; return xs.filter(x => (x < 170) || (x > 250 && x < 350) || (x > 430)); }
  if (kind === 'shores') return xs.filter(x => x < 206 || x > 404);
  if (kind === 'sparseL') return xs.filter((x, i) => x < 320 && i % 1 === 0).filter((x, i) => i % 1 === 0).filter((_, i) => layer === 0 ? true : i % 2 === 0);
  if (kind === 'sparseR') return xs.filter(x => x > 280).filter((_, i) => layer === 0 ? true : i % 2 === 0);
  return xs;
}

function attrs(obj) {
  return Object.entries(obj).map(([k, v]) => {
    if (v === null || v === undefined) return '';
    const attr = k
      .replace(/^className$/, 'class')
      .replace(/strokeWidth$/, 'stroke-width')
      .replace(/strokeLinecap$/, 'stroke-linecap')
      .replace(/strokeLinejoin$/, 'stroke-linejoin')
      .replace(/strokeDasharray$/, 'stroke-dasharray')
      .replace(/fillOpacity$/, 'fill-opacity')
      .replace(/clipPath$/, 'clip-path')
      .replace(/textAnchor$/, 'text-anchor')
      .replace(/fontFamily$/, 'font-family')
      .replace(/fontWeight$/, 'font-weight')
      .replace(/fontSize$/, 'font-size')
      .replace(/letterSpacing$/, 'letter-spacing')
      .replace(/floodColor$/, 'flood-color')
      .replace(/floodOpacity$/, 'flood-opacity');
    if (k === 'style' && typeof v === 'object') {
      const s = Object.entries(v).map(([sk, sv]) => `${sk.replace(/([A-Z])/g, m => '-' + m.toLowerCase())}:${sv}`).join(';');
      return `style="${s}"`;
    }
    return `${attr}="${v}"`;
  }).filter(Boolean).join(' ');
}

function tag(name, a, children = '') { const a2 = attrs(a); return `<${name}${a2 ? ' ' + a2 : ''}>${children}</${name}>`; }
function stag(name, a) { const a2 = attrs(a); return `<${name}${a2 ? ' ' + a2 : ''}/>`;  }

/**
 * buildBadgeSvg(peak, pal, { climbed? }) → SVG string (complete <svg> element)
 */
function buildBadgeSvg(peak, pal, opts = {}) {
  const climbed = !!opts.climbed;
  const uid = peak.id;
  const sc = peak.scene || {};
  const pts = peak.ridge;
  const E = [];

  // ── defs ──────────────────────────────────────────────────────────────────
  let defsContent = tag('clipPath', { id: 'cs-' + uid }, stag('use', { href: '#sh-' + uid, transform: 'translate(16.5,18.59) scale(0.945)' }));
  let outline = '', sIdx = 0;

  if (pts) {
    const n = pts.length;
    pts.forEach((p, i) => { if (p[1] < pts[sIdx][1]) sIdx = i; });
    outline = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (let i = 1; i < n; i++) outline += ' L' + pts[i][0] + ' ' + pts[i][1];
    const outlineClosed = outline + ` L${pts[n - 1][0]} ${BASEY} L${pts[0][0]} ${BASEY} Z`;
    defsContent += tag('clipPath', { id: 'mtn-' + uid }, stag('path', { d: outlineClosed }));
    if (sc.feature === 'lake') {
      defsContent += tag('clipPath', { id: 'lake-' + uid }, stag('path', { d: 'M70 400 L70 370 C150 363 210 374 270 369 C340 364 396 376 462 369 C496 366 516 374 530 371 L530 400 Z' }));
    }
  }
  defsContent += stag('path', { id: 'sh-' + uid, d: SHIELD });
  defsContent += tag('filter', { id: 'patchShadow', x: '-20%', y: '-20%', width: '140%', height: '140%' },
    stag('feDropShadow', { dx: 0, dy: 6, stdDeviation: 8, floodColor: '#000000', floodOpacity: 0.22 }));

  // ── sky + sun + birds ──────────────────────────────────────────────────────
  E.push(stag('rect', { x: 70, y: 70, width: 460, height: 540, fill: pal.sky }));
  if (sc.sun) E.push(stag('circle', { cx: sc.sun[0], cy: sc.sun[1], r: sc.sun[2], fill: pal.sun }));
  (sc.birds || []).forEach(b => E.push(stag('path', { d: BIRD, transform: `translate(${b[0]},${b[1]}) scale(${b[2]})`, fill: pal.bd })));

  const SK = {
    A: 'M70 366 L70 300 L130 264 L196 296 L262 258 L330 292 L398 258 L466 294 L530 266 L530 366 Z',
    B: 'M70 366 L70 288 L120 250 L168 286 L214 248 L268 290 L320 250 L372 288 L420 250 L470 286 L530 258 L530 366 Z',
    C: 'M70 366 L70 322 C140 302 200 324 270 314 C340 304 400 322 470 312 C500 308 520 316 530 318 L530 366 Z',
  };
  E.push(stag('path', { d: SK[sc.sky || 'A'], fill: pal.back }));

  // ── mountain ──────────────────────────────────────────────────────────────
  if (pts) {
    const n = pts.length, S = pts[sIdx];
    const mEls = [];
    mEls.push(stag('rect', { x: 110, y: 100, width: 380, height: 280, fill: pal.pM }));

    let lit = 'M' + pts[0][0] + ' ' + BASEY;
    for (let i = 0; i <= sIdx; i++) lit += ' L' + pts[i][0] + ' ' + pts[i][1];
    lit += ` L${S[0]} ${BASEY} Z`;
    mEls.push(stag('path', { d: lit, fill: pal.pL }));

    if (sIdx >= 1) {
      const L1 = pts[sIdx - 1];
      const midY = S[1] + (BASEY - S[1]) * 0.42;
      mEls.push(stag('path', { d: `M${L1[0]} ${L1[1]} L${S[0]} ${S[1]} L${S[0]} ${midY} L${(L1[0] + S[0]) / 2} ${midY + 8} Z`, fill: lighten(pal.pL, 0.16) }));
    }

    let shadow = 'M' + S[0] + ' ' + S[1];
    for (let i = sIdx + 1; i < n; i++) shadow += ' L' + pts[i][0] + ' ' + pts[i][1];
    shadow += ` L${pts[n - 1][0]} ${BASEY} L${S[0]} ${BASEY} Z`;
    mEls.push(stag('path', { d: shadow, fill: pal.pS }));

    if (sIdx + 1 < n) {
      const R1 = pts[sIdx + 1];
      mEls.push(stag('path', { d: `M${S[0]} ${S[1]} L${R1[0]} ${R1[1]} L${R1[0]} ${BASEY} L${S[0]} ${BASEY} Z`, fill: pal.pD }));
    }
    if (sIdx + 2 < n) {
      const R2 = pts[n - 2];
      mEls.push(stag('path', { d: `M${R2[0]} ${R2[1]} L${pts[n - 1][0]} ${pts[n - 1][1]} L${pts[n - 1][0]} ${BASEY} L${R2[0]} ${BASEY} Z`, fill: darken(pal.pS, 0.12) }));
    }

    // snow
    const cap = sc.snow === 'cross' ? 0 : 46;
    if (sc.snow === 'cross') {
      mEls.push(stag('path', { d: `M${S[0] - 12} ${S[1] + 18} L${S[0]} ${S[1]} L${S[0] + 12} ${S[1] + 18} L${S[0] + 5} ${S[1] + 20} L${S[0]} ${S[1] + 8} L${S[0] - 5} ${S[1] + 20} Z`, fill: pal.hi }));
      mEls.push(stag('rect', { x: S[0] - 6, y: S[1] + 14, width: 12, height: 150, fill: pal.hi }));
      mEls.push(stag('rect', { x: S[0] - 30, y: S[1] + 84, width: 60, height: 14, fill: pal.hi }));
      mEls.push(stag('rect', { x: S[0] + 2, y: S[1] + 14, width: 4, height: 150, fill: pal.hiSh }));
    } else {
      const thr = S[1] + cap;
      let a = sIdx, b = sIdx;
      while (a > 0 && pts[a - 1][1] <= thr) a--;
      while (b < n - 1 && pts[b + 1][1] <= thr) b++;
      let d = 'M' + pts[a][0] + ' ' + pts[a][1];
      for (let i = a + 1; i <= b; i++) d += ' L' + pts[i][0] + ' ' + pts[i][1];
      const xR = pts[b][0], xL = pts[a][0], zz = (xR - xL) / 3;
      d += ` L${xR} ${thr} L${xR - zz} ${thr - 7} L${xR - 2 * zz} ${thr + 5} L${xL} ${thr - 2} Z`;
      mEls.push(stag('path', { d, fill: pal.hi }));
      mEls.push(stag('path', { d: `M${S[0]} ${S[1]} L${pts[Math.min(b, n - 1)][0]} ${pts[Math.min(b, n - 1)][1]} L${pts[Math.min(b, n - 1)][0]} ${thr - 3} L${S[0]} ${thr} Z`, fill: pal.hiSh, opacity: 0.9 }));
      if (sc.snow === 'angel') {
        mEls.push(stag('path', { d: `M${S[0]} ${thr - 6} L${S[0] - 4} ${thr + 70} L${S[0] + 4} ${thr + 70} Z M${S[0] - 6} ${thr + 6} L${S[0] - 30} ${thr + 64} L${S[0] - 20} ${thr + 64} Z M${S[0] + 6} ${thr + 6} L${S[0] + 30} ${thr + 64} L${S[0] + 20} ${thr + 64} Z`, fill: pal.hi }));
      }
    }

    let spurs = `M${S[0]} ${S[1]} L${S[0] + 2} ${S[1] + (BASEY - S[1]) * 0.55}`;
    for (let i = sIdx + 1; i < n - 1; i++) { const p = pts[i]; spurs += ` M${p[0]} ${p[1]} L${p[0] + 2} ${p[1] + (BASEY - p[1]) * 0.4}`; }
    for (let i = 1; i < sIdx; i++) { const p = pts[i]; spurs += ` M${p[0]} ${p[1]} L${p[0] - 1} ${p[1] + (BASEY - p[1]) * 0.32}`; }
    mEls.push(stag('path', { d: spurs, fill: 'none', stroke: pal.bd, strokeWidth: 1.1, strokeLinecap: 'round' }));

    E.push(tag('g', { clipPath: `url(#mtn-${uid})` }, mEls.join('')));
    E.push(stag('path', { d: outline, fill: 'none', stroke: pal.bd, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }));
  }

  // ── ground + trees ─────────────────────────────────────────────────────────
  E.push(stag('path', { d: 'M70 402 L70 366 C160 352 230 374 300 362 C370 350 440 374 530 366 L530 402 Z', fill: pal.mid }));
  const layC = [pal.pn1, pal.pn2, pal.pn3], layY = [370, 382, 396], layS = [0.82, 1.0, 1.2];
  const treeKind = sc.trees || 'full';
  for (let L = 0; L < 3; L++) {
    treeXs(treeKind, L).forEach(x => E.push(stag('path', { d: FIR, transform: `translate(${x},${layY[L]}) scale(${layS[L]})`, fill: layC[L] })));
  }
  if (sc.feature === 'lake') {
    E.push(stag('path', { d: 'M70 400 L70 370 C150 363 210 374 270 369 C340 364 396 376 462 369 C496 366 516 374 530 371 L530 400 Z', fill: lighten(pal.back, 0.05) }));
    const lakeKids = [stag('path', { d: 'M70 371 C150 364 210 375 270 370 C340 365 396 377 462 370 C496 367 516 375 530 372 L530 381 L70 381 Z', fill: darken(pal.back, 0.08) })];
    [[182, pal.sun, 14], [300, darken(pal.back, 0.05), 3], [314, pal.hi, 7], [332, darken(pal.back, 0.05), 4]].forEach(r =>
      lakeKids.push(stag('rect', { x: r[0], y: 371, width: r[2], height: 30, fill: r[1] })));
    E.push(tag('g', { clipPath: `url(#lake-${uid})` }, lakeKids.join('')));
    E.push(stag('path', { d: 'M70 370 C150 363 210 374 270 369 C340 364 396 376 462 369 C496 366 516 374 530 371', fill: 'none', stroke: lighten(pal.back, 0.2), strokeWidth: 2 }));
  }
  E.push(stag('rect', { x: 70, y: 400, width: 460, height: 300, fill: pal.bn }));

  // ── text ───────────────────────────────────────────────────────────────────
  const rlabel = (opts.rangeLabel || peak.range);
  const T = [];
  const nf = fitFont(peak.name, 56, 240, 0.74, 1, 22);
  T.push(tag('text', { x: 300, y: 448, textAnchor: 'middle', fontFamily: "'Alfa Slab One',serif", fontSize: nf, letterSpacing: 1, fill: pal.nm }, peak.name));
  const subText = peak.elev + ' FT * ' + rlabel + ' * CO';
  const sf = fitFont(subText, 15, 205, 0.45, 2.5, 10);
  T.push(tag('text', { x: 300, y: 478, textAnchor: 'middle', fontFamily: 'Oswald,sans-serif', fontWeight: 500, fontSize: sf, letterSpacing: 2.5, fill: pal.sub },
    peak.elev + ' FT <tspan fill="' + pal.ac + '">★</tspan> ' + rlabel + ' <tspan fill="' + pal.ac + '">★</tspan> CO'));
  const pf = fitFont(peak.full, 13, 116, 0.52, 1.5, 8);
  const ptw = estW(peak.full, pf, 0.52, 1.5);
  const plateW = Math.min(176, ptw + 64);
  const plateX = 300 - plateW / 2;
  T.push(
    stag('rect', { x: plateX, y: 486, width: plateW, height: 44, rx: 9, fill: pal.ac }) +
    tag('g', { transform: `translate(${plateX + 16},508)` }, stag('rect', { x: -4.5, y: -4.5, width: 9, height: 9, transform: 'rotate(45)', fill: pal.bd })) +
    tag('g', { transform: `translate(${plateX + plateW - 16},508)` }, stag('rect', { x: -4.5, y: -4.5, width: 9, height: 9, transform: 'rotate(45)', fill: pal.bd })) +
    tag('text', { x: 300, y: 513, textAnchor: 'middle', fontFamily: 'Oswald,sans-serif', fontWeight: 600, fontSize: pf, letterSpacing: 1.5, fill: pal.bd }, peak.full)
  );
  [[268, 332, 552], [276, 324, 561], [285, 315, 570]].forEach(l =>
    T.push(stag('line', { x1: l[0], y1: l[2], x2: l[1], y2: l[2], stroke: darken(pal.ac, 0.12), strokeWidth: 2.4, strokeLinecap: 'round' })));

  // ── assemble ──────────────────────────────────────────────────────────────
  const frame =
    stag('use', { href: '#sh-' + uid, transform: 'translate(-15,-16.9) scale(1.05)', fill: '#20211C' }) +
    stag('use', { href: '#sh-' + uid, transform: 'translate(-10.5,-11.83) scale(1.035)', fill: '#F3EEE3' }) +
    stag('use', { href: '#sh-' + uid, fill: pal.bd }) +
    stag('use', { href: '#sh-' + uid, transform: 'translate(10.5,11.83) scale(0.965)', fill: pal.ky });

  const inner = tag('g', { filter: 'url(#patchShadow)' },
    frame +
    tag('g', { clipPath: `url(#cs-${uid})` }, E.join('')) +
    T.join(''));

  const wrapStyle = climbed ? '' : 'filter:grayscale(0.92) brightness(1.04);opacity:0.62';
  const wrapAttrs = climbed ? {} : { style: wrapStyle };

  return `<svg viewBox="0 0 600 660" xmlns="http://www.w3.org/2000/svg">` +
    tag('defs', {}, `<style>${BADGE_FONTS}</style>` + defsContent) +
    tag('g', wrapAttrs, inner) +
    `</svg>`;
}

module.exports = { buildBadgeSvg };
