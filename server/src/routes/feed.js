const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');
const { allDefaultPhotos, needsAttribution } = require('../utils/mountainPhotos');
const { BLOCKED_EITHER_DIRECTION_SQL } = require('../utils/blocks');

// Real climb photo takes priority; falls back to the mountain's curated
// default photo (rank 0) when the climb has none of its own, so a feed card
// never has to fall all the way back to the generic procedural placeholder
// just because nobody's uploaded a photo of that peak yet.
function withPhotoUrl(r, req, defaultPhotos) {
  const base = req ? `${req.protocol}://${req.get('host')}` : '';
  if (r.photo_path) {
    return { ...r, photo_url: `${base}/uploads/${r.photo_path}`, photo_is_default: false, photo_credit_author: null };
  }
  const def = (defaultPhotos[r.mountain_id] || [])[0];
  if (!def) {
    return { ...r, photo_url: null, photo_is_default: false, photo_credit_author: null };
  }
  return {
    ...r,
    photo_url: `${base}/assets/peak-photos/${def.filename}`,
    photo_is_default: true,
    photo_credit_author: needsAttribution(def.license) ? def.author : null,
  };
}

// 'chronological' orders by the date the climb happened (default); 'activity'
// orders by when it was posted, so an old climb logged just now still shows
// up near the top instead of sinking to where its climb_date would place it.
// c.id DESC breaks ties deterministically (created_at has 1-second resolution,
// so concurrent posts in the same second would otherwise sort arbitrarily).
function orderClause(sort) {
  return sort === 'activity'
    ? 'c.created_at DESC, c.id DESC'
    : 'c.climb_date DESC, c.created_at DESC, c.id DESC';
}

// GET /api/feed — climbs from people you follow
router.get('/', requireAuth, (req, res) => {
  const { page = '1', sort } = req.query;
  const offset = (Number(page) - 1) * 30;
  const db = getDb();
  const defaultPhotos = allDefaultPhotos(db);

  const rows = db.prepare(`
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
      AND c.user_id NOT IN ${BLOCKED_EITHER_DIRECTION_SQL}
    ORDER BY ${orderClause(sort)}
    LIMIT 30 OFFSET ?
  `).all(req.user.id, req.user.id, req.user.id, req.user.id, offset).map(r => ({
    ...withPhotoUrl(r, req, defaultPhotos),
    user_avatar_url: r.user_avatar_path ? `${req.protocol}://${req.get('host')}/uploads/${r.user_avatar_path}` : null,
    is_liked: !!r.is_liked,
    like_count: r.like_count ?? 0,
    comment_count: r.comment_count ?? 0,
  }));

  res.json(rows);
});

// GET /api/feed/discover — all public climbs
router.get('/discover', requireAuth, (req, res) => {
  const { page = '1', sort } = req.query;
  const offset = (Number(page) - 1) * 30;
  const db = getDb();
  const defaultPhotos = allDefaultPhotos(db);

  const rows = db.prepare(`
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
      AND c.user_id NOT IN ${BLOCKED_EITHER_DIRECTION_SQL}
    ORDER BY ${orderClause(sort)}
    LIMIT 30 OFFSET ?
  `).all(req.user.id, req.user.id, req.user.id, offset).map(r => ({
    ...withPhotoUrl(r, req, defaultPhotos),
    user_avatar_url: r.user_avatar_path ? `${req.protocol}://${req.get('host')}/uploads/${r.user_avatar_path}` : null,
    is_liked: !!r.is_liked,
    like_count: r.like_count ?? 0,
    comment_count: r.comment_count ?? 0,
  }));

  res.json(rows);
});

module.exports = router;
