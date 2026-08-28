const fs = require('fs');
const path = require('path');
const { findPeak, PALETTES } = require('./peaks-data');
const { buildBadgeSvg } = require('./patch-render-svg');

// Read once at module load -- both are small, static, versioned-with-the-repo
// assets (not user uploads), so there's no reason to hit disk per request.
const APP_ICON_DATA_URI = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '../../public/app-icon.png')).toString('base64')}`;
const APP_STORE_BADGE_DATA_URI = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '../../public/appstore-badge.png')).toString('base64')}`;
// Apple's badge PNG is 957x320 -- used to keep the embedded badge's aspect
// ratio correct at whatever display height the story footer uses.
const APP_STORE_BADGE_ASPECT = 957 / 320;

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

// The big mountain-name headline used a fixed 3-tier bucket by character
// count, which was tuned against the curated Colorado peaks (never more
// than ~18 chars). Real-world names go well past that -- "SOUTHERN SLOPE OF
// MOUNT FRISSELL AT MASSACHUSETTS BORDER" is Connecticut's actual official
// state-highpoint name -- so this shrinks continuously to fit maxWidth
// instead of flooring out and overflowing. Alfa Slab One is a bold
// all-caps display face; 0.62x font-size per character is a close enough
// width estimate for a fit computation (doesn't need to be exact, just
// not an undershoot).
function fitMountainFontSize(text, maxWidth, { base, min, letterSpacing = 2 }) {
  const estWidth = (fs) => text.length * fs * 0.78 + Math.max(0, text.length - 1) * letterSpacing;
  const w = estWidth(base);
  if (w <= maxWidth) return base;
  return Math.max(min, base * maxWidth / w);
}

// Resolves the peak/palette + badge SVG shared by every card shape, so
// landscape and portrait renderers stay in sync on what badge gets drawn.
function resolveBadge(mountainName) {
  const peak = findPeak(mountainName);
  const pal = peak ? PALETTES[peak.palette] : PALETTES.SAWATCH;
  const badgeSvg = peak ? buildBadgeSvg(peak, pal, { climbed: true, stateAbbr: peak.stateAbbr }) : '';
  return { peak, pal, badgeSvg };
}

// "14ER"/"13ER" eyebrow label -- this app added 13er support after
// launching 14ers-only, so this can't just hardcode "14ER" anymore.
function summitEyebrow(elevation) {
  return elevation >= 14000 ? 'COLORADO 14ER SUMMIT' : 'COLORADO 13ER SUMMIT';
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
//
// Uses the same 'Oswald'/'Alfa Slab One' families loaded via resvg's
// fontFiles in ogImage.js -- generic families like Arial/Helvetica/Impact
// aren't installed on the server and render as missing-glyph boxes there.
function creditPill(creditAuthor, right, bottom) {
  if (!creditAuthor) return '';
  const label = `Photo: ${creditAuthor}`;
  const width = label.length * 7 + 24;
  return `
  <rect x="${right - width}" y="${bottom - 24}" width="${width}" height="24" rx="12" fill="#000000" fill-opacity="0.55"/>
  <text x="${right - width / 2}" y="${bottom - 7}" text-anchor="middle" font-family="Oswald, sans-serif"
    font-size="13" font-weight="500" fill="#ffffff">
    ${esc(label)}
  </text>`;
}

// Story footer branding: small app icon + "Switchback: Summit Tracker",
// with Apple's official "Download on the App Store" badge underneath --
// replaces the old plain "14ERS TRACKER · ..." branding line.
function storyFooter(centerX, rowY) {
  const iconSize = 40;
  const wordmarkText = 'SWITCHBACK: SUMMIT TRACKER';
  const wordmarkFontSize = 22;
  const textW = wordmarkText.length * (wordmarkFontSize * 0.56);
  const rowW = iconSize + 14 + textW;
  const iconX = centerX - rowW / 2;
  const iconY = rowY - iconSize / 2;
  const textX = iconX + iconSize + 14;

  const badgeH = 74;
  const badgeW = Math.round(badgeH * APP_STORE_BADGE_ASPECT);
  const badgeX = centerX - badgeW / 2;
  const badgeY = rowY + 40;

  return `
  <clipPath id="storyAppIconClip"><rect x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" rx="9"/></clipPath>
  <image href="${APP_ICON_DATA_URI}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" clip-path="url(#storyAppIconClip)"/>
  <rect x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" rx="9" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1"/>
  <text x="${textX}" y="${rowY + 7}" font-family="Oswald, sans-serif" font-size="${wordmarkFontSize}" font-weight="600" fill="#ffffff" letter-spacing="1">${esc(wordmarkText)}</text>
  <image href="${APP_STORE_BADGE_DATA_URI}" x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}"/>`;
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
  // A few real official names run well past anything the curated Colorado
  // set ever had (Connecticut's actual state-highpoint name is "Southern
  // Slope of Mount Frissell at Massachusetts Border", 56 characters) --
  // shrinking alone can't fit that at a legible size, so cap it outright.
  const mtnDisplay = truncate(peak ? peak.name : mountain.name.toUpperCase(), 28);
  const mtnFontSize = fitMountainFontSize(mtnDisplay, 740, { base: 80, min: 40 });

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

  <!-- "COLORADO 14ER/13ER SUMMIT" eyebrow -->
  <text x="${textX}" y="155" font-family="Oswald, sans-serif"
    font-size="17" font-weight="500" fill="${accentColor}" letter-spacing="5">
    ${summitEyebrow(mountain.elevation)}
  </text>

  <!-- Climber name -->
  <text x="${textX}" y="220" font-family="Oswald, sans-serif"
    font-size="30" font-weight="500" fill="#cccccc">
    ${name}
  </text>

  <!-- "summited" -->
  <text x="${textX}" y="262" font-family="Oswald, sans-serif"
    font-size="20" font-weight="500" fill="#777777" letter-spacing="3">
    SUMMITED
  </text>

  <!-- Mountain name (big, bold, accent) -->
  <text x="${textX}" y="${262 + 18 + mtnFontSize}" font-family="'Alfa Slab One', serif"
    font-size="${mtnFontSize}" fill="${accentColor}" letter-spacing="2">
    ${mtnDisplay}
  </text>

  <!-- Elevation · Range -->
  <text x="${textX}" y="455" font-family="Oswald, sans-serif"
    font-size="24" font-weight="500" fill="#aaaaaa">
    ${mountain.elevation.toLocaleString()} ft  ·  ${rangeLabel}
  </text>

  <!-- Date -->
  <text x="${textX}" y="503" font-family="Oswald, sans-serif"
    font-size="18" font-weight="500" fill="#666666">
    ${fmtDate(climbDate)}
  </text>

  <!-- Branding -->
  <text x="${textX}" y="585" font-family="Oswald, sans-serif"
    font-size="14" font-weight="600" fill="${subColor}" letter-spacing="3">
    14ERS TRACKER · COLORADO 14ERS + 13ERS
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
  const leftBg = pal.bd;

  const name = truncate(climberName || 'A climber', 24);
  // See renderOgCard's identical comment -- a few real official names
  // (e.g. Connecticut's 56-character state-highpoint name) run well past
  // anything shrinking alone can keep legible, so cap it outright.
  const mtnDisplay = truncate(peak ? peak.name : mountain.name.toUpperCase(), 34);
  const mtnFontSize = fitMountainFontSize(mtnDisplay, 980, { base: 92, min: 40 });

  const rangeLabel = mountain.range
    .replace(' Mountains', ' Mtns')
    .replace(' Range', ' Range');

  const badgeW = 320;
  const badgeH = Math.round(badgeW * 660 / 600);
  const badgeX = Math.round((W - badgeW) / 2);
  // Shifted up from the original (470 -> 684) to open room at the bottom
  // for the two-row footer (app icon + wordmark, App Store badge) without
  // crowding the Instagram safe zone.
  const badgeY = H - safeBottom - badgeH - 684;

  const textCenterX = W / 2;
  const eyebrowY = badgeY + badgeH + 90;
  const dateY = eyebrowY + 112 + 20 + mtnFontSize + 100;
  const footerRowY = dateY + 90;

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

  <!-- "COLORADO 14ER/13ER SUMMIT" eyebrow -->
  <text x="${textCenterX}" y="${eyebrowY}" text-anchor="middle" font-family="Oswald, sans-serif"
    font-size="22" font-weight="500" fill="${accentColor}" letter-spacing="6">
    ${summitEyebrow(mountain.elevation)}
  </text>

  <!-- Climber name -->
  <text x="${textCenterX}" y="${eyebrowY + 60}" text-anchor="middle" font-family="Oswald, sans-serif"
    font-size="34" font-weight="500" fill="#dddddd">
    ${name}
  </text>

  <!-- "summited" -->
  <text x="${textCenterX}" y="${eyebrowY + 112}" text-anchor="middle" font-family="Oswald, sans-serif"
    font-size="24" font-weight="500" fill="#888888" letter-spacing="3">
    SUMMITED
  </text>

  <!-- Mountain name (big, bold, accent) -->
  <text x="${textCenterX}" y="${eyebrowY + 112 + 20 + mtnFontSize}" text-anchor="middle" font-family="'Alfa Slab One', serif"
    font-size="${mtnFontSize}" fill="${accentColor}" letter-spacing="2">
    ${mtnDisplay}
  </text>

  <!-- Elevation · Range -->
  <text x="${textCenterX}" y="${eyebrowY + 112 + 20 + mtnFontSize + 56}" text-anchor="middle" font-family="Oswald, sans-serif"
    font-size="30" font-weight="500" fill="#bbbbbb">
    ${mountain.elevation.toLocaleString()} ft  ·  ${rangeLabel}
  </text>

  <!-- Date -->
  <text x="${textCenterX}" y="${dateY}" text-anchor="middle" font-family="Oswald, sans-serif"
    font-size="22" font-weight="500" fill="#777777">
    ${fmtDate(climbDate)}
  </text>

  <!-- Branding: app icon + wordmark, App Store badge -->
  ${storyFooter(textCenterX, footerRowY)}

  <!-- Photo credit -->
  ${creditPill(photo?.creditAuthor, W - 24, H - safeBottom - 30)}
</svg>`;
}

module.exports = { renderOgCard, renderStoryCard };
