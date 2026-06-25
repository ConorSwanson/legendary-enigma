const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');

function withPhotoUrl(r, req) {
  const base = req ? `${req.protocol}://${req.get('host')}` : '';
  return { ...r, photo_url: r.photo_path ? `${base}/uploads/${r.photo_path}` : null };
}

// GET /api/feed — climbs from people you follow
router.get('/', requireAuth, (req, res) => {
  const { page = '1' } = req.query;
  const offset = (Number(page) - 1) * 30;

  const rows = getDb().prepare(`
    SELECT c.id, c.climb_date, c.photo_path, c.visibility, c.notes,
           m.name AS mountain_name, m.elevation, m.range, m.id AS mountain_id,
           u.id AS user_id, u.name AS user_name, u.avatar_path AS user_avatar_path,
           (SELECT COUNT(*) FROM climb_likes WHERE climb_id = c.id) AS like_count,
           EXISTS(SELECT 1 FROM climb_likes WHERE climb_id = c.id AND user_id = ?) AS is_liked,
           (SELECT COUNT(*) FROM climb_comments WHERE climb_id = c.id) AS comment_count
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    JOIN users u ON c.user_id = u.id
    WHERE c.user_id IN (
        SELECT following_id FROM follows WHERE follower_id = ?
      )
      AND c.visibility IN ('public','followers')
    ORDER BY c.climb_date DESC, c.created_at DESC
    LIMIT 30 OFFSET ?
  `).all(req.user.id, req.user.id, offset).map(r => ({
    ...withPhotoUrl(r, req),
    user_avatar_url: r.user_avatar_path ? `${req.protocol}://${req.get('host')}/uploads/${r.user_avatar_path}` : null,
    is_liked: !!r.is_liked,
    like_count: r.like_count ?? 0,
    comment_count: r.comment_count ?? 0,
  }));

  res.json(rows);
});

// GET /api/feed/discover — all public climbs
router.get('/discover', requireAuth, (req, res) => {
  const { page = '1' } = req.query;
  const offset = (Number(page) - 1) * 30;

  const rows = getDb().prepare(`
    SELECT c.id, c.climb_date, c.photo_path, c.visibility, c.notes,
           m.name AS mountain_name, m.elevation, m.range, m.id AS mountain_id,
           u.id AS user_id, u.name AS user_name, u.avatar_path AS user_avatar_path,
           (SELECT COUNT(*) FROM climb_likes WHERE climb_id = c.id) AS like_count,
           EXISTS(SELECT 1 FROM climb_likes WHERE climb_id = c.id AND user_id = ?) AS is_liked,
           (SELECT COUNT(*) FROM climb_comments WHERE climb_id = c.id) AS comment_count
    FROM climbs c
    JOIN mountains m ON c.mountain_id = m.id
    JOIN users u ON c.user_id = u.id
    WHERE c.visibility = 'public'
    ORDER BY c.climb_date DESC, c.created_at DESC
    LIMIT 30 OFFSET ?
  `).all(req.user.id, offset).map(r => ({
    ...withPhotoUrl(r, req),
    user_avatar_url: r.user_avatar_path ? `${req.protocol}://${req.get('host')}/uploads/${r.user_avatar_path}` : null,
    is_liked: !!r.is_liked,
    like_count: r.like_count ?? 0,
    comment_count: r.comment_count ?? 0,
  }));

  res.json(rows);
});

module.exports = router;
