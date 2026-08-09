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

  // With a photo: it fills the frame, darkened by a left-to-right gradient
  // (near-opaque behind the badge/text panel, fading toward the right) so
  // the existing layout stays exactly as legible as the flat-gradient case.
  // Without one: identical to the original flat palette-tinted background.
  const photoLayer = photo ? `
    <image href="${photo.dataUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${W}" height="${H}" fill="url(#photoScrim)"/>` : '';
  const backgroundLayer = photo ? photoLayer : `<rect width="${W}" height="${H}" fill="url(#bgGrad)"/>`;
  // A dark pill behind the credit text, not just the scrim, since the scrim
  // deliberately fades toward this corner to let the photo show through --
  // relying on it alone would make the credit illegible on a bright photo.
  const creditLabel = photo?.creditAuthor ? `Photo: ${photo.creditAuthor}` : '';
  const creditWidth = creditLabel.length * 7 + 24;
  const creditText = photo?.creditAuthor ? `
  <rect x="${W - 16 - creditWidth}" y="${H - 38}" width="${creditWidth}" height="24" rx="12" fill="#000000" fill-opacity="0.55"/>
  <text x="${W - 16 - creditWidth / 2}" y="${H - 21}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-size="13" font-weight="400" fill="#ffffff">
    ${esc(creditLabel)}
  </text>` : '';

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

  <!-- Photo credit (CC-BY/CC-BY-SA only; Public Domain/CC0 need none) -->
  ${creditText}
</svg>`;
}

module.exports = { renderOgCard };
