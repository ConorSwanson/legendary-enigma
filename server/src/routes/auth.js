const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');

function withAvatarUrl(user) {
  return { ...user, avatar_url: user.avatar_path ? `/uploads/${user.avatar_path}` : null };
}

// GET /api/auth/me — returns the current DB user (creates on first call)
router.get('/me', requireAuth, (req, res) => {
  res.json(withAvatarUrl(req.user));
});

module.exports = router;
