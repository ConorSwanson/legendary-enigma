const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');
const { pushToUser } = require('../utils/push');

function withAvatarUrl(user) {
  return { ...user, avatar_url: user.avatar_path ? `/uploads/${user.avatar_path}` : null };
}

// GET /api/users/search?q=
router.get('/search', requireAuth, (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const users = getDb().prepare(`
    SELECT id, name, bio, avatar_path FROM users
    WHERE name LIKE ? AND id != ?
    LIMIT 20
  `).all(q, req.user.id);
  res.json(users.map(withAvatarUrl));
});

// GET /api/users/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, bio, avatar_path FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { total_climbs } = db.prepare(
    "SELECT COUNT(*) AS total_climbs FROM climbs WHERE user_id = ? AND visibility != 'private'"
  ).get(user.id);
  const { unique_peaks } = db.prepare(
    "SELECT COUNT(DISTINCT mountain_id) AS unique_peaks FROM climbs WHERE user_id = ? AND visibility != 'private'"
  ).get(user.id);
  const { followers } = db.prepare(
    'SELECT COUNT(*) AS followers FROM follows WHERE following_id = ?'
  ).get(user.id);
  const { following } = db.prepare(
    'SELECT COUNT(*) AS following FROM follows WHERE follower_id = ?'
  ).get(user.id);
  const is_following = !!db.prepare(
    'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(req.user.id, user.id);

  res.json({ ...withAvatarUrl(user), total_climbs, unique_peaks, followers, following, is_following });
});

// POST /api/users/:id/follow
router.post('/:id/follow', requireAuth, (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

  const db = getDb();
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const result = db.prepare(
    'INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)'
  ).run(req.user.id, targetId);

  if (result.changes > 0) {
    db.prepare(
      "INSERT INTO notifications (user_id, from_user_id, type) VALUES (?, ?, 'follow')"
    ).run(targetId, req.user.id);
    const fromUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    pushToUser(targetId, {
      title: 'New Follower',
      body: `${fromUser?.name || 'Someone'} started following you`,
    }).catch(() => {});
  }

  res.json({ success: true });
});

// DELETE /api/users/:id/follow
router.delete('/:id/follow', requireAuth, (req, res) => {
  getDb().prepare(
    'DELETE FROM follows WHERE follower_id = ? AND following_id = ?'
  ).run(req.user.id, Number(req.params.id));
  res.json({ success: true });
});

// GET /api/users/:id/climbs — public climbs of a user
router.get('/:id/climbs', requireAuth, (req, res) => {
  const db = getDb();
  const targetId = Number(req.params.id);
  const isOwn = targetId === req.user.id;

  const isFollowing = !isOwn && !!db.prepare(
    'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(req.user.id, targetId);

  let visFilter = isOwn
    ? '1=1'
    : isFollowing
      ? "visibility IN ('public','followers')"
      : "visibility = 'public'";

  const climbs = db.prepare(`
    SELECT c.id, c.climb_date, c.photo_path, c.visibility,
           m.name AS mountain_name, m.elevation, m.range
    FROM climbs c JOIN mountains m ON c.mountain_id = m.id
    WHERE c.user_id = ? AND ${visFilter}
    ORDER BY c.climb_date DESC, c.created_at DESC
    LIMIT 50
  `).all(targetId).map(r => ({ ...r, photo_url: r.photo_path ? `${req.protocol}://${req.get('host')}/uploads/${r.photo_path}` : null }));

  res.json(climbs);
});

module.exports = router;
