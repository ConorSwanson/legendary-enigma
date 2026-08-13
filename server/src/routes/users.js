const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');
const { pushToUser } = require('../utils/push');
const { levelForCount } = require('../utils/levels');
const { hasBlocked } = require('../utils/blocks');

function withAvatarUrl(user, base) {
  return { ...user, avatar_url: user.avatar_path ? `${base}/uploads/${user.avatar_path}` : null };
}

// GET /api/users/search?q=
router.get('/search', requireAuth, (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const q = `%${req.query.q || ''}%`;
  const users = getDb().prepare(`
    SELECT id, name, bio, avatar_path FROM users
    WHERE name LIKE ? AND id != ?
      AND id NOT IN (
        SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
        UNION
        SELECT blocker_id FROM user_blocks WHERE blocked_id = ?
      )
    LIMIT 20
  `).all(q, req.user.id, req.user.id, req.user.id);
  res.json(users.map(u => withAvatarUrl(u, base)));
});

// GET /api/users/blocked — users you've blocked, for a management screen
router.get('/blocked', requireAuth, (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const users = getDb().prepare(`
    SELECT u.id, u.name, u.bio, u.avatar_path
    FROM user_blocks b JOIN users u ON u.id = b.blocked_id
    WHERE b.blocker_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.id);
  res.json(users.map(u => ({
    id: u.id, name: u.name, bio: u.bio,
    avatar_url: u.avatar_path ? `${base}/uploads/${u.avatar_path}` : null,
  })));
});

// GET /api/users/all?secret=X — export every registered account (protected
// by the same env secret as /api/beta/list). No password hashes included.
// Secret goes in a header, not a query string, so it never ends up in
// server access logs or gets forwarded via a Referer header.
router.get('/all', (req, res) => {
  const secret = process.env.BETA_LIST_SECRET;
  if (!secret || req.get('x-admin-secret') !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const rows = getDb().prepare(
    'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json({ count: rows.length, users: rows });
});

// POST /api/users/:id/block — hides each other's content and drops any
// existing follow relationship in either direction.
router.post('/:id/block', requireAuth, (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot block yourself' });

  const db = getDb();
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  db.prepare('INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)')
    .run(req.user.id, targetId);
  db.prepare(
    'DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)'
  ).run(req.user.id, targetId, targetId, req.user.id);

  res.json({ success: true });
});

// DELETE /api/users/:id/block
router.delete('/:id/block', requireAuth, (req, res) => {
  getDb().prepare('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?')
    .run(req.user.id, Number(req.params.id));
  res.json({ success: true });
});

// GET /api/users/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const base = `${req.protocol}://${req.get('host')}`;
  const targetId = Number(req.params.id);

  // A user who's blocked you doesn't exist as far as you're concerned.
  if (hasBlocked(db, targetId, req.user.id)) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = db.prepare('SELECT id, name, bio, avatar_path, background_path FROM users WHERE id = ?').get(targetId);
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
  const is_blocked = hasBlocked(db, req.user.id, user.id);

  const rank = levelForCount(unique_peaks);

  res.json({
    ...withAvatarUrl(user, base),
    background_url: user.background_path ? `${base}/uploads/${user.background_path}` : null,
    total_climbs, unique_peaks, followers, following, is_following, is_blocked, rank,
  });
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

// GET /api/users/:id/followers
router.get('/:id/followers', requireAuth, (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const users = getDb().prepare(`
    SELECT u.id, u.name, u.bio, u.avatar_path
    FROM follows f JOIN users u ON u.id = f.follower_id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC LIMIT 200
  `).all(req.params.id);
  res.json(users.map(u => ({
    id: u.id, name: u.name, bio: u.bio,
    avatar_url: u.avatar_path ? `${base}/uploads/${u.avatar_path}` : null,
  })));
});

// GET /api/users/:id/following
router.get('/:id/following', requireAuth, (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const users = getDb().prepare(`
    SELECT u.id, u.name, u.bio, u.avatar_path
    FROM follows f JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC LIMIT 200
  `).all(req.params.id);
  res.json(users.map(u => ({
    id: u.id, name: u.name, bio: u.bio,
    avatar_url: u.avatar_path ? `${base}/uploads/${u.avatar_path}` : null,
  })));
});

// GET /api/users/:id/climbs — public climbs of a user
router.get('/:id/climbs', requireAuth, (req, res) => {
  const db = getDb();
  const targetId = Number(req.params.id);
  const isOwn = targetId === req.user.id;

  if (!isOwn && hasBlocked(db, targetId, req.user.id)) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (!isOwn && hasBlocked(db, req.user.id, targetId)) {
    return res.json([]);
  }

  const isFollowing = !isOwn && !!db.prepare(
    'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(req.user.id, targetId);

  let visFilter = isOwn
    ? '1=1'
    : isFollowing
      ? "visibility IN ('public','followers')"
      : "visibility = 'public'";

  const climbs = db.prepare(`
    SELECT c.id, c.mountain_id, c.climb_date, c.notes, c.photo_path, c.visibility, c.created_at,
           m.name AS mountain_name, m.elevation, m.range
    FROM climbs c JOIN mountains m ON c.mountain_id = m.id
    WHERE c.user_id = ? AND ${visFilter}
    ORDER BY c.climb_date DESC, c.created_at DESC
    LIMIT 50
  `).all(targetId).map(r => ({ ...r, photo_url: r.photo_path ? `${req.protocol}://${req.get('host')}/uploads/${r.photo_path}` : null }));

  res.json(climbs);
});

module.exports = router;
