const { generateBadge, getPatchTheme } = require('./badge');

const VW = 120, VH = 138;
const SX = 14, SY = 14, SW = 92, SH = 86;
const mtnScaleX = SW / 100;
const mtnScaleY = SH / 100;

function archD(ins) {
  const x1 = 8 + ins, x2 = 112 - ins;
  const yArch = 48 + ins, yBot = 132 - ins;
  const rx = 52 - ins;
  return `M ${x1} ${yBot} L ${x1} ${yArch} A ${rx} 40 0 0 1 ${x2} ${yArch} L ${x2} ${yBot} Z`;
}

function treePath(cx, baseY, h) {
  const w = h * 0.38;
  const tiers = [0, 0.32, 0.62];
  const parts = tiers.map((f, i) => {
    const tier = i / (tiers.length - 1);
    const tierW = w * (0.3 + tier * 0.7);
    const y0 = baseY - h + h * f;
    const y1 = i < tiers.length - 1 ? baseY - h + h * tiers[i + 1] + h * 0.08 : baseY;
    return `M${cx} ${y0} L${cx - tierW} ${y1} L${cx + tierW} ${y1}Z`;
  });
  const tw = w * 0.07;
  parts.push(`M${cx - tw} ${baseY} L${cx + tw} ${baseY} L${cx + tw} ${baseY + h * 0.07} L${cx - tw} ${baseY + h * 0.07}Z`);
  return parts.join(' ');
}

function badgeSvgContent(mountain, prefix) {
  const badge = generateBadge(mountain.id, mountain.elevation);
  const theme = getPatchTheme(mountain.range);
  const sunCx = SX + badge.fg.peakX * mtnScaleX;
  const sunCy = SY + (badge.fg.peakY - 8) * mtnScaleY;
  const sunR = 19;
  const displayName = mountain.name.replace('Mount ', 'Mt. ').replace('Mountain', 'Mtn.');
  const nameFontSize = displayName.length > 14 ? 10 : displayName.length > 10 ? 11.5 : 13;

  const treesSvg = badge.trees.map((t, i) => {
    const patchX = SX + t.x * mtnScaleX;
    const treeH = 24 + (i % 4) * 5;
    return `<path d="${treePath(patchX, 100, treeH)}" fill="${theme.treeDark}"/>`;
  }).join('');

  return `
  <defs>
    <linearGradient id="sky-${prefix}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.skyTop}"/>
      <stop offset="100%" stop-color="${theme.skyBottom}"/>
    </linearGradient>
    <linearGradient id="mtn-${prefix}" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${theme.fgLight}"/>
      <stop offset="100%" stop-color="${theme.fgMtn}"/>
    </linearGradient>
    <radialGradient id="sun-${prefix}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${theme.sunGlow}" stop-opacity="0.6"/>
      <stop offset="60%" stop-color="${theme.sunGlow}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${theme.sunGlow}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="scl-${prefix}"><path d="${archD(6)}"/></clipPath>
  </defs>
  <path d="${archD(0)}" fill="${theme.outerBorder}"/>
  <path d="${archD(3)}" fill="none" stroke="${theme.innerLine}" stroke-width="1"/>
  <path d="${archD(6)}" fill="url(#sky-${prefix})"/>
  <g clip-path="url(#scl-${prefix})">
    <circle cx="${sunCx}" cy="${sunCy}" r="${sunR + 20}" fill="url(#sun-${prefix})"/>
    <circle cx="${sunCx}" cy="${sunCy}" r="${sunR + 6}" fill="${theme.sunGlow}" fill-opacity="0.25"/>
    <circle cx="${sunCx}" cy="${sunCy}" r="${sunR}" fill="${theme.sunColor}"/>
    <g transform="translate(${SX},${SY}) scale(${mtnScaleX},${mtnScaleY})">
      <path d="${badge.bg}" fill="${theme.bgMtn}" fill-opacity="0.75"/>
    </g>
    <g transform="translate(${SX},${SY}) scale(${mtnScaleX},${mtnScaleY})">
      <path d="${badge.mid}" fill="${theme.midMtn}"/>
    </g>
    <g transform="translate(${SX},${SY}) scale(${mtnScaleX},${mtnScaleY})">
      <path d="${badge.fg.body}" fill="url(#mtn-${prefix})"/>
    </g>
    ${badge.fg.snow ? `<g transform="translate(${SX},${SY}) scale(${mtnScaleX},${mtnScaleY})"><path d="${badge.fg.snow}" fill="${theme.snow}"/></g>` : ''}
    <rect x="14" y="86" width="92" height="8" fill="${theme.groundFar}"/>
    <rect x="14" y="92" width="92" height="8" fill="${theme.groundNear}"/>
    ${treesSvg}
    <rect x="14" y="100" width="92" height="26" fill="${theme.bannerBg}"/>
    <line x1="14" y1="100" x2="106" y2="100" stroke="${theme.innerLine}" stroke-width="0.8"/>
    <text x="60" y="115" text-anchor="middle" fill="${theme.bannerText}"
      font-size="${nameFontSize}" font-family="Impact, Arial Black, sans-serif"
      font-weight="900" letter-spacing="1">${displayName.toUpperCase()}</text>
    <text x="60" y="124" text-anchor="middle" fill="${theme.bannerSub}"
      font-size="6.5" font-family="Georgia, Times New Roman, serif"
      letter-spacing="1.5">· ${mountain.elevation.toLocaleString()}′ ·</text>
  </g>
  <path d="${archD(2)}" fill="none" stroke="${theme.stitching}" stroke-width="0.8" stroke-dasharray="2.5,2"/>
  <circle cx="107" cy="17" r="9" fill="${theme.outerBorder}"/>
  <circle cx="107" cy="17" r="9" fill="none" stroke="${theme.innerLine}" stroke-width="1.2"/>
  <polyline points="103,17 107,21 113,11" fill="none" stroke="${theme.innerLine}"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// Truncate text to fit within maxWidth using a rough character-width heuristic
function truncate(text, maxChars) {
  return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
}

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/**
 * Returns a 1200×630 SVG string for the OG share card.
 */
function renderOgCard({ mountain, climbDate, climberName, photoUrl }) {
  const theme = getPatchTheme(mountain.range);
  const W = 1200, H = 630;

  // Badge: 300px wide, height proportional
  const badgeW = 300;
  const badgeH = Math.round(badgeW * VH / VW); // 345
  const badgeX = 60;
  const badgeY = Math.round((H - badgeH) / 2); // ~142

  // Divider x between badge panel and text panel
  const divX = badgeX + badgeW + 60; // ~420

  const name = truncate(climberName || 'A climber', 28);
  const mtnDisplay = mountain.name.replace('Mount ', 'Mt. ').replace('Mountain', 'Mtn.').toUpperCase();
  const mtnFontSize = mtnDisplay.length > 16 ? 54 : mtnDisplay.length > 12 ? 62 : 72;

  const textX = divX + 40;
  const textW = W - textX - 60;

  // Use a dark background matching the app; tint the left panel slightly with the border color
  const leftBg = theme.outerBorder;

  // Compute range label
  const rangeLabel = mountain.range.replace(' Mountains', ' Mtns').replace(' Range', ' Range');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${leftBg}"/>
      <stop offset="38%" stop-color="#0d0d0d"/>
      <stop offset="100%" stop-color="#060606"/>
    </linearGradient>
    <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.stitching}" stop-opacity="0"/>
      <stop offset="30%" stop-color="${theme.stitching}" stop-opacity="0.6"/>
      <stop offset="70%" stop-color="${theme.stitching}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${theme.stitching}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

  <!-- Badge panel -->
  <svg x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" viewBox="0 0 ${VW} ${VH}">
    ${badgeSvgContent(mountain, 'og')}
  </svg>

  <!-- Divider line -->
  <line x1="${divX}" y1="0" x2="${divX}" y2="${H}" stroke="url(#divGrad)" stroke-width="1"/>

  <!-- Text panel -->
  <!-- Small label -->
  <text x="${textX}" y="160" font-family="Arial, Helvetica, sans-serif"
    font-size="18" font-weight="400" fill="${theme.stitching}" letter-spacing="4">
    COLORADO 14ER SUMMIT
  </text>

  <!-- Climber name -->
  <text x="${textX}" y="225" font-family="Arial, Helvetica, sans-serif"
    font-size="32" font-weight="300" fill="#cccccc">
    ${name}
  </text>

  <!-- "summited" label -->
  <text x="${textX}" y="265" font-family="Arial, Helvetica, sans-serif"
    font-size="22" font-weight="300" fill="#888888" letter-spacing="2">
    summited
  </text>

  <!-- Mountain name — big, bold, accent color -->
  <text x="${textX}" y="${265 + 20 + mtnFontSize}" font-family="Impact, Arial Black, sans-serif"
    font-size="${mtnFontSize}" font-weight="900" fill="${theme.bannerText}" letter-spacing="2">
    ${mtnDisplay}
  </text>

  <!-- Elevation + range -->
  <text x="${textX}" y="450" font-family="Arial, Helvetica, sans-serif"
    font-size="26" font-weight="400" fill="#aaaaaa">
    ${mountain.elevation.toLocaleString()} ft  ·  ${rangeLabel}
  </text>

  <!-- Date -->
  <text x="${textX}" y="500" font-family="Arial, Helvetica, sans-serif"
    font-size="20" font-weight="300" fill="#666666">
    ${fmtDate(climbDate)}
  </text>

  <!-- App branding -->
  <text x="${textX}" y="580" font-family="Arial, Helvetica, sans-serif"
    font-size="16" font-weight="400" fill="${theme.stitching}" letter-spacing="2">
    14ERS TRACKER · ALL 58 COLORADO 14ERS
  </text>
</svg>`;
}

module.exports = { renderOgCard };
