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

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Resolves the peak/palette + badge SVG shared by every card shape, so
// landscape and portrait renderers stay in sync on what badge gets drawn.
function resolveBadge(mountainName) {
  const peak = findPeak(mountainName);
  const pal = peak ? PALETTES[peak.palette] : PALETTES.SAWATCH;
  const badgeSvg = peak ? buildBadgeSvg(peak, pal, { climbed: true }) : '';
  return { peak, pal, badgeSvg };
}

// Embeds the shield badge (viewBox 600×660) as a nested SVG at the given
// display width, preserving its aspect ratio. Returns '' when there's no
// known peak (mountain outside the curated 14ers/13ers set).
function badgeEmbed(badgeSvg, x, y, w) {
  if (!badgeSvg) return '';
  const h = Math.round(w * 660 / 600);
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 600 660" overflow="visible">
${badgeSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}
</svg>`;
}

// Photo credit pill, anchored to a caller-given bottom-right corner --
// a dark pill behind the text, not just the scrim, since a scrim alone
// can't guarantee legibility against a bright photo.
function creditPill(creditAuthor, right, bottom) {
  if (!creditAuthor) return '';
  const label = `Photo: ${creditAuthor}`;
  const width = label.length * 7 + 24;
  return `
  <rect x="${right - width}" y="${bottom - 24}" width="${width}" height="24" rx="12" fill="#000000" fill-opacity="0.55"/>
  <text x="${right - width / 2}" y="${bottom - 7}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-size="13" font-weight="400" fill="#ffffff">
    ${esc(label)}
  </text>`;
}

/**
 * Returns a 1200×630 SVG string for the iMessage / social OG share card.
 * Shows the shield patch badge on the left and climber info on the right,
 * over either a flat palette-tinted gradient (no photo) or the climb's own
 * photo / the mountain's curated default photo as a full-bleed backdrop
 * (darkened so the badge and text stay legible either way).
 *
 * opts.photo, if given: { dataUri: string, creditAuthor: string|null }.
 * creditAuthor is only set when the photo's license requires attribution
 * (Public Domain/CC0 photos pass creditAuthor: null).
 */
function renderOgCard({ mountain, climbDate, climberName, photo }) {
  const W = 1200, H = 630;

  // Badge: shield viewBox 600×660; display at 260px wide
  const badgeW = 260;
  const badgeH = Math.round(badgeW * 660 / 600); // 286
  const badgeX = 55;
  const badgeY = Math.round((H - badgeH) / 2); // ~172

  const { peak, pal, badgeSvg } = resolveBadge(mountain.name);

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

  // With a photo: it fills the frame, darkened by a left-to-right gradient
  // (near-opaque behind the badge/text panel, fading toward the right) so
  // the existing layout stays exactly as legible as the flat-gradient case.
  // Without one: identical to the original flat palette-tinted background.
  const photoLayer = photo ? `
    <image href="${photo.dataUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${W}" height="${H}" fill="url(#photoScrim)"/>` : '';
  const backgroundLayer = photo ? photoLayer : `<rect width="${W}" height="${H}" fill="url(#bgGrad)"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${leftBg}"/>
      <stop offset="32%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#080808"/>
    </linearGradient>
    <linearGradient id="photoScrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.88"/>
      <stop offset="45%" stop-color="#000000" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0"/>
      <stop offset="25%" stop-color="${accentColor}" stop-opacity="0.5"/>
      <stop offset="75%" stop-color="${accentColor}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background (photo backdrop + scrim, or flat palette gradient) -->
  ${backgroundLayer}

  <!-- Badge (shield patch, climbed=true) -->
  ${badgeEmbed(badgeSvg, badgeX, badgeY, badgeW)}

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

  <!-- Photo credit (CC-BY/CC-BY-SA only; Public Domain/CC0 need none) -->
  ${creditPill(photo?.creditAuthor, W - 16, H - 14)}
</svg>`;
}

/**
 * Returns a 1080×1920 SVG string for an Instagram Story share background.
 * Full-bleed climb photo (or the mountain's curated default) behind
 * everything, with a bottom-up scrim so the badge + climber info sit
 * legibly in the middle band -- Instagram's own UI already occupies the
 * top and bottom ~250px of a Story, so nothing here is drawn out that far.
 *
 * opts.photo: same shape as renderOgCard's.
 */
function renderStoryCard({ mountain, climbDate, climberName, photo }) {
  const W = 1080, H = 1920;
  const safeTop = 250, safeBottom = 250;

  const { peak, pal, badgeSvg } = resolveBadge(mountain.name);
  const accentColor = pal.nm;
  const subColor = pal.sub;
  const leftBg = pal.bd;

  const name = truncate(climberName || 'A climber', 24);
  const mtnDisplay = (peak ? peak.name : mountain.name.toUpperCase());
  const mtnFontSize = mtnDisplay.length > 14 ? 64 : mtnDisplay.length > 10 ? 76 : 92;

  const rangeLabel = mountain.range
    .replace(' Mountains', ' Mtns')
    .replace(' Range', ' Range');

  const badgeW = 320;
  const badgeH = Math.round(badgeW * 660 / 600);
  const badgeX = Math.round((W - badgeW) / 2);
  const badgeY = H - safeBottom - badgeH - 470;

  const textCenterX = W / 2;
  const eyebrowY = badgeY + badgeH + 90;

  const photoLayer = photo ? `
    <image href="${photo.dataUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${W}" height="${H}" fill="url(#storyScrim)"/>` : '';
  const backgroundLayer = photo ? photoLayer : `<rect width="${W}" height="${H}" fill="url(#storyBgGrad)"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="storyBgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${leftBg}"/>
      <stop offset="45%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#080808"/>
    </linearGradient>
    <linearGradient id="storyScrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.15"/>
      <stop offset="${Math.round((safeTop / H) * 100)}%" stop-color="#000000" stop-opacity="0.35"/>
      <stop offset="${Math.round(((H - safeBottom - 700) / H) * 100)}%" stop-color="#000000" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.92"/>
    </linearGradient>
  </defs>

  <!-- Background (photo backdrop + bottom-up scrim, or flat palette gradient) -->
  ${backgroundLayer}

  <!-- Badge (shield patch, climbed=true), centered -->
  ${badgeEmbed(badgeSvg, badgeX, badgeY, badgeW)}

  <!-- "COLORADO 14ER SUMMIT" eyebrow -->
  <text x="${textCenterX}" y="${eyebrowY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-size="22" font-weight="400" fill="${accentColor}" letter-spacing="6">
    COLORADO 14ER SUMMIT
  </text>

  <!-- Climber name -->
  <text x="${textCenterX}" y="${eyebrowY + 60}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-size="34" font-weight="300" fill="#dddddd">
    ${name}
  </text>

  <!-- "summited" -->
  <text x="${textCenterX}" y="${eyebrowY + 112}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-size="24" font-weight="300" fill="#888888" letter-spacing="3">
    SUMMITED
  </text>

  <!-- Mountain name (big, bold, accent) -->
  <text x="${textCenterX}" y="${eyebrowY + 112 + 20 + mtnFontSize}" text-anchor="middle" font-family="Impact, Arial Black, sans-serif"
    font-size="${mtnFontSize}" font-weight="900" fill="${accentColor}" letter-spacing="2">
    ${mtnDisplay}
  </text>

  <!-- Elevation · Range -->
  <text x="${textCenterX}" y="${eyebrowY + 112 + 20 + mtnFontSize + 56}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-size="30" font-weight="400" fill="#bbbbbb">
    ${mountain.elevation.toLocaleString()} ft  ·  ${rangeLabel}
  </text>

  <!-- Date -->
  <text x="${textCenterX}" y="${eyebrowY + 112 + 20 + mtnFontSize + 100}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-size="22" font-weight="300" fill="#777777">
    ${fmtDate(climbDate)}
  </text>

  <!-- Branding -->
  <text x="${textCenterX}" y="${H - safeBottom - 40}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-size="18" font-weight="400" fill="${subColor}" letter-spacing="3">
    14ERS TRACKER · ALL 58 COLORADO 14ERS
  </text>

  <!-- Photo credit -->
  ${creditPill(photo?.creditAuthor, W - 24, H - safeBottom - 90)}
</svg>`;
}

module.exports = { renderOgCard, renderStoryCard };
