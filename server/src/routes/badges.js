const express = require('express');
const router = express.Router();
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { buildBadgeSvg } = require('../utils/patch-render-svg');
const { PALETTES, RANGE_LABEL, peakByDbId } = require('../data/peaks-data');

const FONT_DIR = path.join(__dirname, '../assets/fonts');
const RESVG_OPTS = {
  fitTo: { mode: 'width', value: 300 },
  font: {
    loadSystemFonts: false,
    fontFiles: [
      path.join(FONT_DIR, 'alfa-slab-one.ttf'),
      path.join(FONT_DIR, 'oswald-500.ttf'),
      path.join(FONT_DIR, 'oswald-600.ttf'),
    ],
  },
};

// In-memory PNG cache — badges are deterministic, no need to re-render
const pngCache = new Map();

function badgeSvgFor(req) {
  const numericId = parseInt(req.params.id, 10);
  if (isNaN(numericId)) return null;
  const peak = peakByDbId(numericId);
  if (!peak) return null;
  const climbed = req.query.climbed === '1' || req.query.climbed === 'true';
  const pal = PALETTES[peak.palette];
  const rangeLabel = RANGE_LABEL[peak.range] || peak.range;
  return { svg: buildBadgeSvg(peak, pal, { climbed, rangeLabel }), cacheKey: `${numericId}:${climbed ? 1 : 0}` };
}

// GET /api/badges/:id/png?climbed=1  — PNG for iOS AsyncImage
router.get('/:id/png', (req, res) => {
  const result = badgeSvgFor(req);
  if (!result) return res.status(404).json({ error: 'Not found' });
  const { svg, cacheKey } = result;

  if (pngCache.has(cacheKey)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(pngCache.get(cacheKey));
  }

  try {
    const resvg = new Resvg(svg, RESVG_OPTS);
    const png = resvg.render().asPng();
    pngCache.set(cacheKey, png);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(png);
  } catch (err) {
    console.error('SVG→PNG error:', err);
    res.status(500).json({ error: 'render_failed' });
  }
});

// GET /api/badges/:id?climbed=1  — SVG for web
router.get('/:id', (req, res) => {
  const result = badgeSvgFor(req);
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(result.svg);
});

// Pre-render all 58 peaks × 2 states (climbed/unclimbed) at startup
function warmBadgeCache() {
  const { DB_ID_TO_PEAK_ID } = require('../data/peaks-data');
  let count = 0;
  for (const numericId of Object.keys(DB_ID_TO_PEAK_ID)) {
    for (const climbed of [true, false]) {
      const cacheKey = `${numericId}:${climbed ? 1 : 0}`;
      if (pngCache.has(cacheKey)) continue;
      try {
        const peak = peakByDbId(parseInt(numericId, 10));
        if (!peak) continue;
        const pal = PALETTES[peak.palette];
        const rangeLabel = RANGE_LABEL[peak.range] || peak.range;
        const svg = buildBadgeSvg(peak, pal, { climbed, rangeLabel });
        const png = new Resvg(svg, RESVG_OPTS).render().asPng();
        pngCache.set(cacheKey, png);
        count++;
      } catch (_) {}
    }
  }
  console.log(`[badges] Pre-rendered ${count} badge PNGs`);
}

module.exports = router;
module.exports.warmBadgeCache = warmBadgeCache;
