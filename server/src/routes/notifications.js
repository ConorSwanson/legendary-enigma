const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');
const { nameForLevel } = require('../utils/levels');

// GET /api/notifications/unread-count  (must come before /:id-style routes)
router.get('/unread-count', requireAuth, (req, res) => {
  const { count } = getDb().prepare(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(req.user.id);
  res.json({ count });
});

// GET /api/notifications
router.get('/', requireAuth, (req, res) => {
  const rows = getDb().prepare(`
    SELECT n.id, n.type, n.from_user_id, n.climb_id, n.comment_id, n.level, n.is_read, n.created_at,
           u.name AS from_user_name, u.avatar_path AS from_user_avatar_path,
           m.name AS mountain_name
    FROM notifications n
    JOIN users u ON u.id = n.from_user_id
    LEFT JOIN climbs c ON c.id = n.climb_id
    LEFT JOIN mountains m ON m.id = c.mountain_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.user.id);

  const base = (req.headers['x-forwarded-proto'] || req.protocol) + '://' + req.get('host');
  res.json(rows.map(n => ({
    id: n.id,
    type: n.type,
    from_user_id: n.from_user_id,
    from_user_name: n.from_user_name,
    from_user_avatar_url: n.from_user_avatar_path ? `${base}/uploads/${n.from_user_avatar_path}` : null,
    climb_id: n.climb_id,
    comment_id: n.comment_id,
    mountain_name: n.mountain_name,
    level: n.level,
    level_name: n.level != null ? nameForLevel(n.level) : null,
    is_read: !!n.is_read,
    created_at: n.created_at,
  })));
});

// POST /api/notifications/read-all
router.post('/read-all', requireAuth, (req, res) => {
  getDb().prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
