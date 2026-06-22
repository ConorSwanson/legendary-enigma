const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const { getDb } = require('../db');
const { renderOgCard } = require('../utils/renderOgCard');

// Simple in-memory cache so repeated social crawler fetches don't re-render
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// GET /api/og/climb/:id → 1200×630 PNG for social previews
router.get('/climb/:id', async (req, res) => {
  const { id } = req.params;

  const cached = cache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=600');
    return res.send(cached.buf);
  }

  const row = getDb().prepare(`
    SELECT c.id, c.climb_date, c.visibility,
           c.mountain_id,
           m.name AS mountain_name, m.elevation, m.range,
           u.name AS user_name
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(id);

  if (!row || row.visibility === 'private') {
    return res.status(404).send('Not found');
  }

  const svg = renderOgCard({
    mountain: {
      id: row.mountain_id,
      name: row.mountain_name,
      elevation: row.elevation,
      range: row.range,
    },
    climbDate: row.climb_date,
    climberName: row.user_name,
  });

  try {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    cache.set(id, { buf: png, ts: Date.now() });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(png);
  } catch (err) {
    console.error('OG image render error:', err);
    res.status(500).send('Render error');
  }
});

module.exports = router;
