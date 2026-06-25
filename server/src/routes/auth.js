const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { getDb } = require('../db');

function withUrls(user, req) {
  const base = `${req.protocol}://${req.get('host')}`;
  return {
    ...user,
    avatar_url:     user.avatar_path     ? `${base}/uploads/${user.avatar_path}`     : null,
    background_url: user.background_path ? `${base}/uploads/${user.background_path}` : null,
  };
}

// GET /api/auth/me — returns the current user, creates on first call
router.get('/me', requireAuth, (req, res) => {
  res.json(withUrls(req.user, req));
});

// POST /api/auth/device-token — register APNs device token
router.post('/device-token', requireAuth, (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  getDb().prepare(
    'INSERT OR IGNORE INTO device_tokens (user_id, token) VALUES (?, ?)'
  ).run(req.user.id, token);
  res.json({ success: true });
});

module.exports = router;
