const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const { Resvg } = require('@resvg/resvg-js');
const { buildBadgeSvg } = require('../utils/patch-render-svg');
const { buildRankMedallionSvg } = require('../utils/rank-badge-render-svg');
const { PALETTES, RANGE_LABEL, peakByDbId } = require('../data/peaks-data');
const { findPeak } = require('../utils/peaks-data');
const { LEVELS } = require('../utils/levels');
const { getDb } = require('../db');

// DB_ID_TO_PEAK_ID is a static snapshot: numeric mountain_id -> peak slug,
// generated once and committed. That's fine for the original 58 + the
// Colorado 13ers, whose ids were stable by the time each batch shipped.
// It's NOT reliable for a batch generated against a dev DB whose
// pre-existing row count doesn't match production's -- SQLite assigns ids
// sequentially, so every id in the file ends up shifted by however many
// rows production already had that the dev DB didn't, silently pointing
// each mountain at some other peak's badge entirely. Falling back to a
// live name lookup sidesteps id drift altogether: peak.full is always
// exactly what's in mountains.name for anything findPeak can match.
function resolvePeak(numericId) {
  const staticPeak = peakByDbId(numericId);
  if (staticPeak) return staticPeak;
  const row = getDb().prepare('SELECT name FROM mountains WHERE id = ?').get(numericId);
  return row ? findPeak(row.name) : null;
}

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

function etagFor(buf) {
  return '"' + crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16) + '"';
}

// Content-addressed ETag support: the iOS client's on-device image cache
// keeps a badge PNG forever once fetched (no expiry, keyed only by URL), so
// a server-side content fix alone -- new badge art, a corrected name, a
// rebalanced palette, whatever -- would never reach an install that already
// cached the old bytes. The client revalidates with If-None-Match on every
// view instead of trusting Cache-Control's max-age blindly; since the ETag
// is a hash of the actual PNG bytes, it only changes when the image
// actually does, so this stays a cheap 304 the rest of the time.
function sendPngWithEtag(req, res, png) {
  const etag = etagFor(png);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('ETag', etag);
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  res.send(png);
}

function badgeSvgFor(req) {
  const numericId = parseInt(req.params.id, 10);
  if (isNaN(numericId)) return null;
  const peak = resolvePeak(numericId);
  if (!peak) return null;
  const climbed = req.query.climbed === '1' || req.query.climbed === 'true';
  const pal = PALETTES[peak.palette];
  const rangeLabel = RANGE_LABEL[peak.range] || peak.range;
  return { svg: buildBadgeSvg(peak, pal, { climbed, rangeLabel, stateAbbr: peak.stateAbbr }), cacheKey: `${numericId}:${climbed ? 1 : 0}` };
}

function rankSvgFor(req) {
  const level = parseInt(req.params.level, 10);
  const def = LEVELS.find(l => l.level === level);
  if (!def) return null;
  const locked = req.query.locked === '1' || req.query.locked === 'true';
  return { svg: buildRankMedallionSvg(level, def.name, { locked }), cacheKey: `rank:${level}:${locked ? 'lk' : 'un'}` };
}

// GET /api/badges/rank/:level/png?locked=1  — Climber Rank medallion PNG
router.get('/rank/:level/png', (req, res) => {
  const result = rankSvgFor(req);
  if (!result) return res.status(404).json({ error: 'Not found' });
  const { svg, cacheKey } = result;

  if (pngCache.has(cacheKey)) {
    return sendPngWithEtag(req, res, pngCache.get(cacheKey));
  }

  try {
    const resvg = new Resvg(svg, RESVG_OPTS);
    const png = resvg.render().asPng();
    pngCache.set(cacheKey, png);
    sendPngWithEtag(req, res, png);
  } catch (err) {
    console.error('Rank SVG→PNG error:', err);
    res.status(500).json({ error: 'render_failed' });
  }
});

// GET /api/badges/rank/:level?locked=1  — Climber Rank medallion SVG
router.get('/rank/:level', (req, res) => {
  const result = rankSvgFor(req);
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(result.svg);
});

// GET /api/badges/:id/png?climbed=1  — PNG for iOS AsyncImage
router.get('/:id/png', (req, res) => {
  const result = badgeSvgFor(req);
  if (!result) return res.status(404).json({ error: 'Not found' });
  const { svg, cacheKey } = result;

  if (pngCache.has(cacheKey)) {
    return sendPngWithEtag(req, res, pngCache.get(cacheKey));
  }

  try {
    const resvg = new Resvg(svg, RESVG_OPTS);
    const png = resvg.render().asPng();
    pngCache.set(cacheKey, png);
    sendPngWithEtag(req, res, png);
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

// Pre-render every peak × 2 states (climbed/unclimbed) at startup. Driven
// off the actual mountains table, not just DB_ID_TO_PEAK_ID's static keys
// -- that map doesn't cover (or can be wrong for, see resolvePeak above)
// anything imported since it was last generated.
function warmBadgeCache() {
  const ids = getDb().prepare('SELECT id FROM mountains').all().map(r => r.id);
  let count = 0;
  for (const numericId of ids) {
    for (const climbed of [true, false]) {
      const cacheKey = `${numericId}:${climbed ? 1 : 0}`;
      if (pngCache.has(cacheKey)) continue;
      try {
        const peak = resolvePeak(numericId);
        if (!peak) continue;
        const pal = PALETTES[peak.palette];
        const rangeLabel = RANGE_LABEL[peak.range] || peak.range;
        const svg = buildBadgeSvg(peak, pal, { climbed, rangeLabel, stateAbbr: peak.stateAbbr });
        const png = new Resvg(svg, RESVG_OPTS).render().asPng();
        pngCache.set(cacheKey, png);
        count++;
      } catch (_) {}
    }
  }
  console.log(`[badges] Pre-rendered ${count} badge PNGs`);
}

// Pre-render every rank medallion × 2 states (locked/unlocked) at startup
function warmRankBadgeCache() {
  let count = 0;
  for (const def of LEVELS) {
    for (const locked of [true, false]) {
      const cacheKey = `rank:${def.level}:${locked ? 'lk' : 'un'}`;
      if (pngCache.has(cacheKey)) continue;
      try {
        const svg = buildRankMedallionSvg(def.level, def.name, { locked });
        const png = new Resvg(svg, RESVG_OPTS).render().asPng();
        pngCache.set(cacheKey, png);
        count++;
      } catch (_) {}
    }
  }
  console.log(`[badges] Pre-rendered ${count} rank medallion PNGs`);
}

module.exports = router;
module.exports.warmBadgeCache = warmBadgeCache;
module.exports.warmRankBadgeCache = warmRankBadgeCache;
