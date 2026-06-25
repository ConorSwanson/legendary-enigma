const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');

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

module.exports = router;
