const { findPeak, PALETTES } = require('./peaks-data');
const { buildBadgeSvg } = require('./patch-render-svg');

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/**
 * Returns a 1200×630 SVG string for the iMessage / social OG share card.
 * Shows the shield patch badge on the left and climber info on the right.
 */
function renderOgCard({ mountain, climbDate, climberName }) {
  const W = 1200, H = 630;

  // Badge: shield viewBox 600×660; display at 260px wide
  const badgeW = 260;
  const badgeH = Math.round(badgeW * 660 / 600); // 286
  const badgeX = 55;
  const badgeY = Math.round((H - badgeH) / 2); // ~172

  const peak = findPeak(mountain.name);
  const pal = peak ? PALETTES[peak.palette] : PALETTES.SAWATCH;

  // Generate the shield badge SVG content (climbed=true for OG card)
  let badgeSvg = '';
  if (peak) {
    badgeSvg = buildBadgeSvg(peak, pal, { climbed: true });
  }

  // Use the palette's border color as left-panel tint
  const leftBg = pal.bd;
  const accentColor = pal.nm;   // peak name text color = accent for headings
  const subColor = pal.sub;

  const name = truncate(climberName || 'A climber', 28);
  const mtnDisplay = (peak ? peak.name : mountain.name.toUpperCase());
  const mtnFontSize = mtnDisplay.length > 14 ? 58 : mtnDisplay.length > 10 ? 68 : 80;

  // Divider between badge panel and text panel
  const divX = badgeX + badgeW + 50; // ~365
  const textX = divX + 40;           // ~405

  const rangeLabel = mountain.range
    .replace(' Mountains', ' Mtns')
    .replace(' Range', ' Range');

  // Embed the badge as a nested SVG element
  const badgeEmbed = peak
    ? `<svg x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" viewBox="0 0 600 660" overflow="visible">
${badgeSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}
</svg>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${leftBg}"/>
      <stop offset="32%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#080808"/>
    </linearGradient>
    <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0"/>
      <stop offset="25%" stop-color="${accentColor}" stop-opacity="0.5"/>
      <stop offset="75%" stop-color="${accentColor}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

  <!-- Badge (shield patch, climbed=true) -->
  ${badgeEmbed}

  <!-- Vertical divider -->
  <line x1="${divX}" y1="0" x2="${divX}" y2="${H}" stroke="url(#divGrad)" stroke-width="1"/>

  <!-- "COLORADO 14ER SUMMIT" eyebrow -->
  <text x="${textX}" y="155" font-family="Arial, Helvetica, sans-serif"
    font-size="17" font-weight="400" fill="${accentColor}" letter-spacing="5">
    COLORADO 14ER SUMMIT
  </text>

  <!-- Climber name -->
  <text x="${textX}" y="220" font-family="Arial, Helvetica, sans-serif"
    font-size="30" font-weight="300" fill="#cccccc">
    ${name}
  </text>

  <!-- "summited" -->
  <text x="${textX}" y="262" font-family="Arial, Helvetica, sans-serif"
    font-size="20" font-weight="300" fill="#777777" letter-spacing="3">
    SUMMITED
  </text>

  <!-- Mountain name (big, bold, accent) -->
  <text x="${textX}" y="${262 + 18 + mtnFontSize}" font-family="Impact, Arial Black, sans-serif"
    font-size="${mtnFontSize}" font-weight="900" fill="${accentColor}" letter-spacing="2">
    ${mtnDisplay}
  </text>

  <!-- Elevation · Range -->
  <text x="${textX}" y="455" font-family="Arial, Helvetica, sans-serif"
    font-size="24" font-weight="400" fill="#aaaaaa">
    ${mountain.elevation.toLocaleString()} ft  ·  ${rangeLabel}
  </text>

  <!-- Date -->
  <text x="${textX}" y="503" font-family="Arial, Helvetica, sans-serif"
    font-size="18" font-weight="300" fill="#666666">
    ${fmtDate(climbDate)}
  </text>

  <!-- Branding -->
  <text x="${textX}" y="585" font-family="Arial, Helvetica, sans-serif"
    font-size="14" font-weight="400" fill="${subColor}" letter-spacing="3">
    14ERS TRACKER · ALL 58 COLORADO 14ERS
  </text>
</svg>`;
}

module.exports = { renderOgCard };
