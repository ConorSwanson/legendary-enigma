const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const uid = req.user.id;

  const { total_mountains } = db.prepare('SELECT COUNT(*) AS total_mountains FROM mountains').get();

  const totals = db.prepare(`
    SELECT
      COUNT(*)                          AS total_climbs,
      COUNT(DISTINCT c.mountain_id)     AS unique_peaks,
      COALESCE(SUM(m.elevation), 0)     AS total_elevation
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    WHERE c.user_id = ?
  `).get(uid);

  const by_month = db.prepare(`
    SELECT strftime('%Y-%m', climb_date) AS month, COUNT(*) AS count
    FROM climbs WHERE user_id = ?
    GROUP BY month ORDER BY month ASC
  `).all(uid);

  const by_year = db.prepare(`
    SELECT strftime('%Y', climb_date) AS year, COUNT(*) AS count
    FROM climbs WHERE user_id = ?
    GROUP BY year ORDER BY year ASC
  `).all(uid);

  const top_mountains = db.prepare(`
    SELECT m.name, m.elevation, COUNT(*) AS climb_count
    FROM climbs c JOIN mountains m ON c.mountain_id = m.id
    WHERE c.user_id = ?
    GROUP BY c.mountain_id ORDER BY climb_count DESC LIMIT 5
  `).all(uid);

  const recent_climbs = db.prepare(`
    SELECT c.id, c.climb_date, c.photo_path, m.name AS mountain_name, m.elevation, m.id AS mountain_id
    FROM climbs c JOIN mountains m ON c.mountain_id = m.id
    WHERE c.user_id = ?
    ORDER BY c.climb_date DESC, c.created_at DESC LIMIT 5
  `).all(uid).map(r => ({ ...r, photo_url: r.photo_path ? `${req.protocol}://${req.get('host')}/uploads/${r.photo_path}` : null }));

  // All mountain IDs the user has climbed (for badge grid)
  const climbed_ids = db.prepare(
    'SELECT DISTINCT mountain_id AS id FROM climbs WHERE user_id = ?'
  ).all(uid).map(r => r.id);

  res.json({ ...totals, total_mountains, by_month, by_year, top_mountains, recent_climbs, climbed_ids });
});

module.exports = router;
