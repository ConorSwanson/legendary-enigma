const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');
const { levelForCount } = require('../utils/levels');

function withAvatarUrl(row, req) {
  const base = `${req.protocol}://${req.get('host')}`;
  return { ...row, avatar_url: row.avatar_path ? `${base}/uploads/${row.avatar_path}` : null };
}

// GET /api/leaderboard?scope=global|following — ranked by unique peaks summited.
// Only non-private climbs count, matching what's already visible on a user's
// public profile — so a leaderboard entry never reveals more than the
// profile page already would.
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const scope = req.query.scope === 'following' ? 'following' : 'global';

  const rows = scope === 'following'
    ? db.prepare(`
        SELECT u.id, u.name, u.avatar_path,
               COUNT(DISTINCT CASE WHEN c.visibility != 'private' THEN c.mountain_id END) AS unique_peaks
        FROM users u
        LEFT JOIN climbs c ON c.user_id = u.id
        WHERE u.id = ? OR u.id IN (SELECT following_id FROM follows WHERE follower_id = ?)
        GROUP BY u.id
        ORDER BY unique_peaks DESC, u.name ASC
        LIMIT 200
      `).all(req.user.id, req.user.id)
    : db.prepare(`
        SELECT u.id, u.name, u.avatar_path,
               COUNT(DISTINCT CASE WHEN c.visibility != 'private' THEN c.mountain_id END) AS unique_peaks
        FROM users u
        LEFT JOIN climbs c ON c.user_id = u.id
        GROUP BY u.id
        ORDER BY unique_peaks DESC, u.name ASC
        LIMIT 200
      `).all();

  const ranked = rows
    .filter(r => r.unique_peaks > 0)
    .map((r, i) => ({
      position: i + 1,
      is_self: r.id === req.user.id,
      rank: levelForCount(r.unique_peaks),
      ...withAvatarUrl(r, req),
    }));

  res.json(ranked);
});

module.exports = router;
