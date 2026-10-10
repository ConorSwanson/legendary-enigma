const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Gated by the same secret as /api/users/all and /api/beta/list -- one
// admin secret to manage, set as BETA_LIST_SECRET in the environment.
function requireAdmin(req, res, next) {
  const secret = process.env.BETA_LIST_SECRET;
  if (!secret || req.get('x-admin-secret') !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function countSince(db, table, interval) {
  return db.prepare(
    `SELECT COUNT(*) AS c FROM ${table} WHERE created_at >= datetime('now', ?)`
  ).get(interval).c;
}

function byDay(db, table, days = 30) {
  return db.prepare(`
    SELECT date(created_at) AS day, COUNT(*) AS count
    FROM ${table}
    WHERE created_at >= datetime('now', ?)
    GROUP BY day
    ORDER BY day
  `).all(`-${days} days`);
}

// GET /api/admin/stats — founder-facing snapshot of growth, activity, and
// content health. All timestamps/day boundaries are UTC (how created_at is
// stored), not the server's or your local timezone.
router.get('/stats', requireAdmin, (req, res) => {
  const db = getDb();

  const users = {
    total: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
    yesterday: db.prepare(
      `SELECT COUNT(*) AS c FROM users WHERE date(created_at) = date('now', '-1 day')`
    ).get().c,
    last_7_days: countSince(db, 'users', '-7 days'),
    last_30_days: countSince(db, 'users', '-30 days'),
    by_day: byDay(db, 'users'),
  };

  const climbsByVisibility = db.prepare(
    'SELECT visibility, COUNT(*) AS count FROM climbs GROUP BY visibility'
  ).all();
  const visibilityMap = { public: 0, followers: 0, private: 0 };
  for (const row of climbsByVisibility) visibilityMap[row.visibility] = row.count;

  const climbs = {
    total: db.prepare('SELECT COUNT(*) AS c FROM climbs').get().c,
    yesterday: db.prepare(
      `SELECT COUNT(*) AS c FROM climbs WHERE date(created_at) = date('now', '-1 day')`
    ).get().c,
    last_7_days: countSince(db, 'climbs', '-7 days'),
    last_30_days: countSince(db, 'climbs', '-30 days'),
    by_day: byDay(db, 'climbs'),
    by_visibility: visibilityMap,
  };

  const climbsWithUserPhoto = db.prepare(
    'SELECT COUNT(*) AS c FROM climbs WHERE photo_path IS NOT NULL'
  ).get().c;

  const engagement = {
    total_likes: db.prepare('SELECT COUNT(*) AS c FROM climb_likes').get().c,
    total_comments: db.prepare('SELECT COUNT(*) AS c FROM climb_comments').get().c,
    total_follows: db.prepare('SELECT COUNT(*) AS c FROM follows').get().c,
    users_who_posted_last_7_days: db.prepare(
      `SELECT COUNT(DISTINCT user_id) AS c FROM climbs WHERE created_at >= datetime('now', '-7 days')`
    ).get().c,
    // "Returning" here means logged more than one climb, ever -- a rough
    // proxy for whether people come back after their first post.
    returning_users: db.prepare(`
      SELECT COUNT(*) AS c FROM (
        SELECT user_id FROM climbs GROUP BY user_id HAVING COUNT(*) > 1
      )
    `).get().c,
    climbs_with_user_photo: climbsWithUserPhoto,
    climbs_using_default_photo: climbs.total - climbsWithUserPhoto,
  };

  const topMountains = db.prepare(`
    SELECT m.name, COUNT(*) AS climb_count
    FROM climbs c JOIN mountains m ON m.id = c.mountain_id
    GROUP BY m.id
    ORDER BY climb_count DESC
    LIMIT 5
  `).all();

  const totalElevation = db.prepare(`
    SELECT COALESCE(SUM(m.elevation), 0) AS total
    FROM climbs c JOIN mountains m ON m.id = c.mountain_id
  `).get().total;

  const content = {
    unique_peaks_climbed: db.prepare('SELECT COUNT(DISTINCT mountain_id) AS c FROM climbs').get().c,
    total_elevation_ft_climbed: totalElevation,
    top_mountains: topMountains,
  };

  const moderation = {
    total_reports: db.prepare('SELECT COUNT(*) AS c FROM content_reports').get().c,
    total_blocks: db.prepare('SELECT COUNT(*) AS c FROM user_blocks').get().c,
  };

  const push = {
    users_with_push_enabled: db.prepare('SELECT COUNT(DISTINCT user_id) AS c FROM device_tokens').get().c,
  };

  res.json({
    generated_at: new Date().toISOString(),
    note: 'Day boundaries are UTC, matching how created_at is stored.',
    users,
    climbs,
    engagement,
    content,
    moderation,
    push,
  });
});

const VALID_VISIBILITY = new Set(['public', 'followers', 'private']);

// GET /api/admin/climbs?user=<name substring> — every climb by matching
// users, newest first, so a moderator can see what they're about to change.
router.get('/climbs', requireAdmin, (req, res) => {
  const q = String(req.query.user || '').trim();
  if (!q) return res.status(400).json({ error: 'user query param required' });

  const db = getDb();
  const users = db.prepare(
    'SELECT id, name, email FROM users WHERE name LIKE ? ORDER BY id'
  ).all(`%${q}%`);

  const climbsFor = db.prepare(`
    SELECT c.id, c.climb_date, c.visibility, c.created_at, m.name AS mountain_name
    FROM climbs c JOIN mountains m ON m.id = c.mountain_id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `);

  res.json(users.map(u => {
    const climbs = climbsFor.all(u.id);
    const byVisibility = { public: 0, followers: 0, private: 0 };
    for (const c of climbs) byVisibility[c.visibility] = (byVisibility[c.visibility] || 0) + 1;
    return { ...u, climb_count: climbs.length, by_visibility: byVisibility, climbs };
  }));
});

// POST /api/admin/climbs/visibility — moderation override for a user's
// climbs. Body: { user_id, visibility, climb_ids?, created_after? }.
// Without climb_ids it only narrows (public → followers → private) every
// matching climb; with climb_ids it sets exactly those, in either direction.
// Returns the ids changed so the action can be undone with climb_ids.
router.post('/climbs/visibility', requireAdmin, (req, res) => {
  const { user_id, visibility, climb_ids, created_after } = req.body || {};
  const userId = Number(user_id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'user_id required' });
  if (!VALID_VISIBILITY.has(visibility)) {
    return res.status(400).json({ error: 'visibility must be public, followers, or private' });
  }
  if (climb_ids !== undefined && (!Array.isArray(climb_ids) || !climb_ids.every(Number.isInteger))) {
    return res.status(400).json({ error: 'climb_ids must be an array of integers' });
  }

  const db = getDb();
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId)) {
    return res.status(404).json({ error: 'User not found' });
  }

  let where = 'user_id = ? AND visibility != ?';
  const params = [userId, visibility];
  if (!climb_ids) {
    // Bulk changes only ever narrow visibility, so hiding posts can't
    // expose a climb the user had already made private.
    const narrower = [...VALID_VISIBILITY].slice(0, [...VALID_VISIBILITY].indexOf(visibility));
    if (narrower.length === 0) return res.status(400).json({ error: 'bulk changes can only reduce visibility; pass climb_ids to widen' });
    where += ` AND visibility IN (${narrower.map(() => '?').join(',')})`;
    params.push(...narrower);
  }
  if (climb_ids) {
    if (climb_ids.length === 0) return res.json({ changed: 0, climb_ids: [] });
    where += ` AND id IN (${climb_ids.map(() => '?').join(',')})`;
    params.push(...climb_ids);
  }
  if (created_after) {
    where += ' AND created_at >= ?';
    params.push(String(created_after));
  }

  const changed = db.transaction(() => {
    const rows = db.prepare(`SELECT id, visibility FROM climbs WHERE ${where}`).all(...params);
    const update = db.prepare('UPDATE climbs SET visibility = ? WHERE id = ?');
    for (const r of rows) update.run(visibility, r.id);
    return rows;
  })();

  res.json({
    changed: changed.length,
    climb_ids: changed.map(r => r.id),
    previous: changed,
  });
});

module.exports = router;
