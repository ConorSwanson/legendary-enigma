// Procedural SVG generator for "Climber Rank" medallions — a carabiner-topped
// coin whose material, ornamentation, and peak-count silhouette escalate with
// tier. Mirrors the peak-badge renderer's approach (raw SVG strings, no
// external assets) but with much simpler coin geometry instead of shield scenes.

const CX = 150, CY = 195, RIM_R = 122, DISC_R = 104;

// 13 material stops: grey → earth/forest → blue → copper/bronze → silver/platinum → gold → radiant.
const TIERS = [
  { rim: '#7d828a', rimDark: '#565a61', disc: '#4b4f57', discDark: '#33363b', accent: '#c7ccd3' }, // 0 Trailhead Rookie
  { rim: '#8a6a4c', rimDark: '#5c4a35', disc: '#543f2c', discDark: '#3a2c1e', accent: '#d8b892' }, // 1 Switchback Scrambler
  { rim: '#5f8a5a', rimDark: '#3f5f3c', disc: '#33502f', discDark: '#213620', accent: '#a9d29e' }, // 2 Ridge Runner
  { rim: '#3f7a52', rimDark: '#295536', disc: '#234a31', discDark: '#163420', accent: '#8fd6a8' }, // 3 Alpine Adventurer
  { rim: '#4c7fa0', rimDark: '#33586f', disc: '#2a4a60', discDark: '#1c3444', accent: '#a6d7ef' }, // 4 Summit Seeker
  { rim: '#4aa0c9', rimDark: '#316f8a', disc: '#245a73', discDark: '#173e4f', accent: '#b7ecff' }, // 5 Peak Bagger
  { rim: '#b06a3c', rimDark: '#7c4a29', disc: '#703f22', discDark: '#4a2916', accent: '#f0b57e' }, // 6 High Country Veteran
  { rim: '#ad7d3e', rimDark: '#7a582b', disc: '#6b4c22', discDark: '#463116', accent: '#f2cb84' }, // 7 Thin Air Master
  { rim: '#7891a8', rimDark: '#526475', disc: '#445a70', discDark: '#2e3d4c', accent: '#cfe3f2' }, // 8 Summit Elite
  { rim: '#b9c1cb', rimDark: '#838a93', disc: '#75808c', discDark: '#525b64', accent: '#f1f4f7' }, // 9 Summit Sage
  { rim: '#cfd6dd', rimDark: '#98a1ab', disc: '#939ba6', discDark: '#6a7178', accent: '#ffffff' }, // 10 Granite Guardian
  { rim: '#d9a53c', rimDark: '#a3781f', disc: '#8a641f', discDark: '#5e4413', accent: '#ffe9a8' }, // 11 Continental Conqueror
  { rim: '#e8b94a', rimDark: '#a3781f', disc: '#14213d', discDark: '#0a1226', accent: '#ffe9a8' }, // 12 Summit Legend
];

const LOCKED = { rim: '#3a3d44', rimDark: '#26282d', disc: '#26282d', discDark: '#1a1c1f', accent: '#565a61' };

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function estW(text, fs, factor = 0.56, ls = 0) { return text.length * fs * factor + Math.max(0, text.length - 1) * ls; }
function fitFont(text, base, max, min = 8) {
  const w = estW(text, base);
  return w > max ? Math.max(min, base * max / w) : base;
}

function starPath(cx, cy, outerR, innerR) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

// A laurel sprig: leaves arcing just outside the rim, from the lower quadrant
// up toward the side. side = -1 for the left sprig, +1 for the right (mirrored).
function laurelSprig(side, leafCount, color) {
  let out = '';
  for (let i = 0; i < leafCount; i++) {
    const t = i / Math.max(1, leafCount - 1);
    // Left sprig sweeps 100°→170°; right mirrors via (180 - angle).
    const leftDeg = 100 + t * 70;
    const deg = side < 0 ? leftDeg : 180 - leftDeg;
    const rad = (deg * Math.PI) / 180;
    const r = RIM_R + 6 + t * 16;
    const x = CX + r * Math.cos(rad);
    const y = CY + r * Math.sin(rad);
    const rx = 9 - t * 3, ry = 4.5 - t * 1.5;
    const tilt = side * (40 + t * 40);
    out += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${color}" opacity="${0.6 + t * 0.3}" transform="rotate(${tilt.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  return out;
}

function mountainSilhouette(peakCount, color, shadowColor) {
  // Peaks span a fixed width, tallest peak roughly centered.
  const w = 140, baseY = CY + 28, topY = CY - 34;
  const n = Math.max(1, peakCount);
  const step = w / (n + 1);
  const startX = CX - w / 2;
  let pts = [`${startX},${baseY}`];
  for (let i = 1; i <= n; i++) {
    const x = startX + step * i;
    const centerBias = 1 - Math.abs(i - (n + 1) / 2) / ((n + 1) / 2);
    const h = topY + (baseY - topY) * (0.15 + 0.55 * (1 - centerBias));
    pts.push(`${(x - step * 0.32).toFixed(1)},${(h + 10).toFixed(1)}`);
    pts.push(`${x.toFixed(1)},${h.toFixed(1)}`);
    pts.push(`${(x + step * 0.32).toFixed(1)},${(h + 10).toFixed(1)}`);
  }
  pts.push(`${(startX + w).toFixed(1)},${baseY}`);
  const path = `M${pts.join(' L')} Z`;
  return (
    `<path d="${path}" transform="translate(1.5,2)" fill="${shadowColor}" opacity="0.5"/>` +
    `<path d="${path}" fill="${color}"/>`
  );
}

function ribbonBanner(text, color, darkColor, textColor) {
  const y = CY + 62;
  const fs = fitFont(text, 15, 150, 8);
  const w = Math.max(120, estW(text, fs) + 24);
  const x0 = CX - w / 2, x1 = CX + w / 2;
  return `
    <path d="M${x0 - 10},${y - 12} L${x0},${y - 12} L${x0 + 6},${y} L${x0},${y + 12} L${x0 - 10},${y + 12} Z" fill="${darkColor}"/>
    <path d="M${x1 + 10},${y - 12} L${x1},${y - 12} L${x1 - 6},${y} L${x1},${y + 12} L${x1 + 10},${y + 12} Z" fill="${darkColor}"/>
    <rect x="${x0}" y="${y - 12}" width="${w}" height="24" fill="${color}"/>
    <text x="${CX}" y="${y + fs * 0.35}" text-anchor="middle" font-family="Oswald, sans-serif" font-weight="600"
          font-size="${fs}" fill="${textColor}" letter-spacing="0.5">${esc(text.toUpperCase())}</text>
  `;
}

/**
 * buildRankMedallionSvg(level, name, opts) → complete <svg> string
 * opts.locked → render muted/greyscale (not yet reached)
 */
function buildRankMedallionSvg(level, name, opts = {}) {
  const locked = !!opts.locked;
  const t = locked ? LOCKED : (TIERS[level] || TIERS[0]);
  const peakCount = Math.min(5, 1 + Math.floor(level / 3));
  const starCount = locked ? 0 : level >= 9 ? 3 : level >= 6 ? 2 : level >= 3 ? 1 : 0;
  const showRibbon = !locked && level >= 6;
  const showLaurel = !locked && level >= 9;
  const isLegend = !locked && level === 12;

  let defs = `
    <radialGradient id="sheen-${level}-${locked ? 'lk' : 'un'}" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.12"/>
    </radialGradient>`;
  if (isLegend) {
    defs += `
    <radialGradient id="legend-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffe9a8" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffe9a8" stop-opacity="0"/>
    </radialGradient>`;
  }

  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340" width="300" height="340">`;
  out += `<defs>${defs}</defs>`;

  // Starburst backdrop (Legend only)
  if (isLegend) {
    out += `<g opacity="0.55">`;
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI / 8) * i;
      const x2 = CX + Math.cos(a) * 155, y2 = CY + Math.sin(a) * 155;
      const x1 = CX + Math.cos(a) * 128, y1 = CY + Math.sin(a) * 128;
      out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${t.accent}" stroke-width="4" stroke-linecap="round"/>`;
    }
    out += `</g><circle cx="${CX}" cy="${CY}" r="140" fill="url(#legend-glow)"/>`;
  }

  // Carabiner loop
  out += `
    <path d="M${CX - 20} ${CY - RIM_R - 8}
             C${CX - 20} ${CY - RIM_R - 40}, ${CX + 20} ${CY - RIM_R - 40}, ${CX + 20} ${CY - RIM_R - 8}
             L${CX + 12} ${CY - RIM_R - 8}
             C${CX + 12} ${CY - RIM_R - 30}, ${CX - 12} ${CY - RIM_R - 30}, ${CX - 12} ${CY - RIM_R - 8} Z"
          fill="${t.rimDark}" stroke="${t.rim}" stroke-width="2"/>`;

  // Rim + disc
  out += `<circle cx="${CX}" cy="${CY}" r="${RIM_R}" fill="${t.rim}" stroke="${t.rimDark}" stroke-width="3"/>`;
  out += `<circle cx="${CX}" cy="${CY}" r="${DISC_R}" fill="${t.disc}"/>`;
  out += `<circle cx="${CX}" cy="${CY}" r="${DISC_R}" fill="url(#sheen-${level}-${locked ? 'lk' : 'un'})"/>`;
  out += `<circle cx="${CX}" cy="${CY}" r="${DISC_R - 8}" fill="none" stroke="${t.accent}" stroke-opacity="0.35" stroke-width="1.5"/>`;

  // Mountain silhouette (locked tiers get a flat single dim peak, no detail)
  out += mountainSilhouette(locked ? 1 : peakCount, t.accent, t.discDark);

  // Stars along the lower rim
  for (let i = 0; i < starCount; i++) {
    const spread = (i - (starCount - 1) / 2) * 30;
    const x = CX + spread, y = CY + RIM_R - 14;
    out += `<path d="${starPath(x, y, 8, 3.4)}" fill="${t.accent}"/>`;
  }

  // Laurel sprigs — drawn on top, flanking outward from the rim
  if (showLaurel) {
    out += laurelSprig(-1, 6, t.accent);
    out += laurelSprig(1, 6, t.accent);
  }

  // Name — plain text for lower tiers, ribboned for 6+
  if (showRibbon) {
    out += ribbonBanner(name, t.rim, t.rimDark, '#0d0f12');
  } else if (!locked) {
    const fs = fitFont(name, 13, 190, 7);
    out += `<text x="${CX}" y="${CY + 58}" text-anchor="middle" font-family="Oswald, sans-serif" font-weight="500"
                  font-size="${fs}" fill="${t.accent}" letter-spacing="0.4">${esc(name.toUpperCase())}</text>`;
  }

  // Lock glyph for un-earned tiers
  if (locked) {
    out += `
      <g transform="translate(${CX - 13},${CY + 46})" opacity="0.85">
        <rect x="0" y="9" width="26" height="20" rx="4" fill="${t.accent}"/>
        <path d="M4 9 V2 A9 9 0 0 1 22 2 V9" fill="none" stroke="${t.accent}" stroke-width="4"/>
      </g>`;
  }

  out += `</svg>`;
  return out;
}

module.exports = { buildRankMedallionSvg, TIERS };
