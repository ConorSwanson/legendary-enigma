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

function badgeSvgFor(req) {
  const numericId = parseInt(req.params.id, 10);
  if (isNaN(numericId)) return null;
  const peak = peakByDbId(numericId);
  if (!peak) return null;
  const climbed = req.query.climbed === '1' || req.query.climbed === 'true';
  const pal = PALETTES[peak.palette];
  const rangeLabel = RANGE_LABEL[peak.range] || peak.range;
  return buildBadgeSvg(peak, pal, { climbed, rangeLabel });
}

// GET /api/badges/:id/png?climbed=1  — PNG for iOS AsyncImage
router.get('/:id/png', (req, res) => {
  const svg = badgeSvgFor(req);
  if (!svg) return res.status(404).json({ error: 'Not found' });
  try {
    const resvg = new Resvg(svg, RESVG_OPTS);
    const png = resvg.render().asPng();
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
  const svg = badgeSvgFor(req);
  if (!svg) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(svg);
});

module.exports = router;
