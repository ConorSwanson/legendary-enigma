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

module.exports = router;
