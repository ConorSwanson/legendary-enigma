const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getDb, UPLOADS_DIR } = require('../db');
const { renderOgCard } = require('../utils/renderOgCard');
const { PEAK_PHOTOS_DIR, needsAttribution } = require('../utils/mountainPhotos');

// Reads an image file straight off disk (never a network fetch -- everything
// this needs is already local, whether a user upload or a self-hosted
// default photo) and returns a data URI, sniffing the real format via sharp
// rather than trusting the file extension.
async function photoDataUri(absPath) {
  const buf = await fs.promises.readFile(absPath);
  const { format } = await sharp(buf).metadata();
  return `data:image/${format};base64,${buf.toString('base64')}`;
}

// Climb's own photo takes priority; falls back to the mountain's curated
// default (rank 0) so a share card still gets a real photo backdrop even
// when nobody's uploaded one of their own yet. Returns null (no photo
// layer -- renderOgCard keeps its original flat-gradient look) if neither
// exists, e.g. a mountain outside the curated 14ers/13ers set.
async function resolvePhoto(db, row) {
  if (row.photo_path) {
    try {
      return { dataUri: await photoDataUri(path.join(UPLOADS_DIR, row.photo_path)), creditAuthor: null };
    } catch (_) { /* fall through to the default photo */ }
  }
  const def = db.prepare(
    'SELECT filename, license, author FROM mountain_photos WHERE mountain_id = ? ORDER BY rank ASC LIMIT 1'
  ).get(row.mountain_id);
  if (!def) return null;
  try {
    return {
      dataUri: await photoDataUri(path.join(PEAK_PHOTOS_DIR, def.filename)),
      creditAuthor: needsAttribution(def.license) ? def.author : null,
    };
  } catch (_) {
    return null;
  }
}

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

  const db = getDb();
  const row = db.prepare(`
    SELECT c.id, c.climb_date, c.visibility, c.photo_path,
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

  const photo = await resolvePhoto(db, row);

  const svg = renderOgCard({
    mountain: {
      id: row.mountain_id,
      name: row.mountain_name,
      elevation: row.elevation,
      range: row.range,
    },
    climbDate: row.climb_date,
    climberName: row.user_name,
    photo,
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
