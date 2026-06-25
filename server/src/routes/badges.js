const express = require('express');
const router = express.Router();
const { buildBadgeSvg } = require('../utils/patch-render-svg');
const { PALETTES, RANGE_LABEL, peakByDbId } = require('../data/peaks-data');

// Public — no auth. Returns the shield-patch SVG for a mountain.
// GET /api/badges/:id?climbed=1
router.get('/:id', (req, res) => {
  const numericId = parseInt(req.params.id, 10);
  if (isNaN(numericId)) return res.status(400).json({ error: 'Invalid id' });

  const peak = peakByDbId(numericId);
  if (!peak) return res.status(404).json({ error: 'Not found' });

  const climbed = req.query.climbed === '1' || req.query.climbed === 'true';
  const pal = PALETTES[peak.palette];
  const rangeLabel = RANGE_LABEL[peak.range] || peak.range;

  const svg = buildBadgeSvg(peak, pal, { climbed, rangeLabel });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(svg);
});

module.exports = router;
