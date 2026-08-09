const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');

// GET /api/mountains/lists — every named peak list (Colorado 14ers, Colorado
// 13ers, ...), with a member count, so the client can build a list picker.
router.get('/lists', (_req, res) => {
  const lists = getDb().prepare(`
    SELECT pl.key, pl.name, pl.region, pl.description, COUNT(plm.mountain_id) AS count
    FROM peak_lists pl
    LEFT JOIN peak_list_memberships plm ON plm.peak_list_id = pl.id
    GROUP BY pl.id
    ORDER BY pl.id ASC
  `).all();
  res.json(lists);
});

// GET /api/mountains?list=KEY — all mountains, or just one list's members
// when ?list= is given (e.g. "co-14ers", "co-13ers").
// Every mountain's list membership, keyed by mountain id — one cheap query
// reused by both branches below instead of a per-row correlated subquery.
function listKeysByMountainId(db) {
  const rows = db.prepare(`
    SELECT plm.mountain_id, pl.key FROM peak_list_memberships plm
    JOIN peak_lists pl ON pl.id = plm.peak_list_id
  `).all();
  const map = {};
  for (const r of rows) (map[r.mountain_id] ??= []).push(r.key);
  return map;
}

// Every mountain's curated default photo(s), keyed by mountain id and
// ordered by rank (0 = primary). CC-BY/CC-BY-SA entries carry author/license/
// source_url so the client can render the required credit line.
function defaultPhotosByMountainId(db, base) {
  const rows = db.prepare(
    'SELECT mountain_id, filename, license, author, source_url FROM mountain_photos ORDER BY mountain_id, rank ASC'
  ).all();
  const map = {};
  for (const r of rows) {
    (map[r.mountain_id] ??= []).push({
      url: `${base}/assets/peak-photos/${r.filename}`,
      license: r.license,
      author: r.author,
      source_url: r.source_url,
    });
  }
  return map;
}

router.get('/', (req, res) => {
  const db = getDb();
  const base = `${req.protocol}://${req.get('host')}`;
  const { list } = req.query;
  const mountains = list
    ? db.prepare(`
        SELECT m.*, (
          SELECT MAX(c.climb_date) FROM climbs c
          WHERE c.mountain_id = m.id AND c.visibility = 'public'
        ) AS last_activity
        FROM mountains m
        JOIN peak_list_memberships plm ON plm.mountain_id = m.id
        JOIN peak_lists pl ON pl.id = plm.peak_list_id
        WHERE pl.key = ?
        ORDER BY m.elevation DESC
      `).all(list)
    : db.prepare(`
        SELECT m.*, (
          SELECT MAX(c.climb_date) FROM climbs c
          WHERE c.mountain_id = m.id AND c.visibility = 'public'
        ) AS last_activity
        FROM mountains m
        ORDER BY m.elevation DESC
      `).all();

  const listKeys = listKeysByMountainId(db);
  const defaultPhotos = defaultPhotosByMountainId(db, base);
  res.json(mountains.map(m => ({
    ...m,
    list_keys: listKeys[m.id] || [],
    default_photos: defaultPhotos[m.id] || [],
  })));
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

  // Fall back to the mountain's curated default photo when nobody's public
  // climb has a photo yet -- same "prefer a real user photo, else the
  // default" rule used everywhere else this shows up (feed, share cards).
  const default_photos = (defaultPhotosByMountainId(db, base)[id] || []);
  const hero_photo_url = recent_photos.length ? recent_photos[0].photo_url : (default_photos[0]?.url ?? null);

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
    default_photos,
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

// GET /api/mountains/:id/climbs?month=MM&year=YYYY — public climbs for a peak,
// optionally filtered by calendar month (seasonality drill-in) or year.
router.get('/:id/climbs', requireAuth, (req, res) => {
  const db = getDb();
  const base = `${req.protocol}://${req.get('host')}`;
  const { month, year } = req.query;

  let where = "c.mountain_id = ? AND c.visibility = 'public'";
  const params = [Number(req.params.id)];
  if (month) { where += " AND strftime('%m', c.climb_date) = ?"; params.push(String(month).padStart(2, '0')); }
  if (year)  { where += " AND strftime('%Y', c.climb_date) = ?"; params.push(String(year)); }

  const rows = db.prepare(`
    SELECT c.id AS climb_id, c.climb_date, u.id AS user_id, u.name AS user_name, u.avatar_path
    FROM climbs c JOIN users u ON u.id = c.user_id
    WHERE ${where}
    ORDER BY c.climb_date DESC, c.created_at DESC LIMIT 100
  `).all(...params).map(r => ({
    climb_id: r.climb_id, climb_date: r.climb_date,
    user_id: r.user_id, user_name: r.user_name,
    user_avatar_url: r.avatar_path ? `${base}/uploads/${r.avatar_path}` : null,
  }));

  res.json(rows);
});

module.exports = router;
