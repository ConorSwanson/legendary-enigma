const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (_req, res) => {
  const db = getDb();

  const totals = db.prepare(`
    SELECT
      COUNT(*)                          AS total_climbs,
      COUNT(DISTINCT c.mountain_id)     AS unique_peaks,
      COALESCE(SUM(m.elevation), 0)     AS total_elevation
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
  `).get();

  const by_month = db.prepare(`
    SELECT strftime('%Y-%m', climb_date) AS month, COUNT(*) AS count
    FROM climbs
    GROUP BY month
    ORDER BY month ASC
  `).all();

  const by_year = db.prepare(`
    SELECT strftime('%Y', climb_date) AS year, COUNT(*) AS count
    FROM climbs
    GROUP BY year
    ORDER BY year ASC
  `).all();

  const top_mountains = db.prepare(`
    SELECT m.name, m.elevation, COUNT(*) AS climb_count
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    GROUP BY c.mountain_id
    ORDER BY climb_count DESC
    LIMIT 5
  `).all();

  const recent_climbs = db.prepare(`
    SELECT c.id, c.climb_date, c.photo_path, m.name AS mountain_name, m.elevation
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    ORDER BY c.climb_date DESC, c.created_at DESC
    LIMIT 5
  `).all().map(r => ({
    ...r,
    photo_url: r.photo_path ? `/uploads/${r.photo_path}` : null,
  }));

  res.json({
    ...totals,
    by_month,
    by_year,
    top_mountains,
    recent_climbs,
  });
});

module.exports = router;
