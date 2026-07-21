const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');

router.get('/', (_req, res) => {
  const mountains = getDb().prepare(`
    SELECT m.*, (
      SELECT MAX(c.climb_date) FROM climbs c
      WHERE c.mountain_id = m.id AND c.visibility = 'public'
    ) AS last_activity
    FROM mountains m
    ORDER BY m.elevation DESC
  `).all();
  res.json(mountains);
});

// GET /api/mountains/:id — mountain info + aggregated stats across public climbs
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const base = `${req.protocol}://${req.get('host')}`;
  const id = Number(req.params.id);

  const mountain = db.prepare('SELECT * FROM mountains WHERE id = ?').get(id);
  if (!mountain) return res.status(404).json({ error: 'Mountain not found' });

  // Aggregate over public climbs only (mountain pages are public to everyone).
  const totals = db.prepare(`
    SELECT COUNT(*) AS total_climbs, COUNT(DISTINCT user_id) AS unique_climbers
    FROM climbs WHERE mountain_id = ? AND visibility = 'public'
  `).get(id);

  const by_year = db.prepare(`
    SELECT strftime('%Y', climb_date) AS year, COUNT(*) AS count
    FROM climbs WHERE mountain_id = ? AND visibility = 'public'
    GROUP BY year ORDER BY year ASC
  `).all(id);

  // Seasonality: calendar month (01-12) aggregated across all years.
  const by_month = db.prepare(`
    SELECT strftime('%m', climb_date) AS month, COUNT(*) AS count
    FROM climbs WHERE mountain_id = ? AND visibility = 'public'
    GROUP BY month ORDER BY month ASC
  `).all(id);

  const recent_summits = db.prepare(`
    SELECT c.id AS climb_id, c.climb_date, u.id AS user_id, u.name AS user_name, u.avatar_path
    FROM climbs c JOIN users u ON u.id = c.user_id
    WHERE c.mountain_id = ? AND c.visibility = 'public'
    ORDER BY c.climb_date DESC, c.created_at DESC LIMIT 20
  `).all(id).map(r => ({
    climb_id: r.climb_id, climb_date: r.climb_date,
    user_id: r.user_id, user_name: r.user_name,
    user_avatar_url: r.avatar_path ? `${base}/uploads/${r.avatar_path}` : null,
  }));

  const recent_photos = db.prepare(`
    SELECT c.id AS climb_id, c.photo_path, u.id AS user_id, u.name AS user_name
    FROM climbs c JOIN users u ON u.id = c.user_id
    WHERE c.mountain_id = ? AND c.visibility = 'public' AND c.photo_path IS NOT NULL
    ORDER BY c.climb_date DESC, c.created_at DESC LIMIT 12
  `).all(id).map(r => ({
    climb_id: r.climb_id, user_id: r.user_id, user_name: r.user_name,
    photo_url: `${base}/uploads/${r.photo_path}`,
  }));

  const hero_photo_url = recent_photos.length ? recent_photos[0].photo_url : null;

  // Requesting user's own ascents (includes their private ones — it's their data).
  const { user_ascents } = db.prepare(
    'SELECT COUNT(*) AS user_ascents FROM climbs WHERE mountain_id = ? AND user_id = ?'
  ).get(id, req.user.id);

  res.json({
    id: mountain.id,
    name: mountain.name,
    elevation: mountain.elevation,
    range: mountain.range,
    hero_photo_url,
    total_climbs: totals.total_climbs,
    unique_climbers: totals.unique_climbers,
    user_ascents,
    is_climbed: user_ascents > 0,
    by_year,
    by_month,
    recent_summits,
    recent_photos,
  });
});

module.exports = router;
