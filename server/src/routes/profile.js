const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb, UPLOADS_DIR } = require('../db');
const upload = require('../middleware/upload');
const requireAuth = require('../middleware/auth');

const UPLOAD_DIR = UPLOADS_DIR;

function withAvatarUrl(user) {
  return { ...user, avatar_url: user.avatar_path ? `/uploads/${user.avatar_path}` : null };
}

router.get('/', requireAuth, (req, res) => {
  res.json(withAvatarUrl(req.user));
});

router.put('/', requireAuth, upload.single('avatar'), (req, res) => {
  const db = getDb();
  const existing = req.user;
  const { name, bio } = req.body;
  let avatar_path = existing.avatar_path;

  if (req.file) {
    if (existing.avatar_path) {
      const old = path.join(UPLOAD_DIR, existing.avatar_path);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    avatar_path = req.file.filename;
  }

  db.prepare('UPDATE users SET name=?, bio=?, avatar_path=? WHERE id=?').run(
    name || existing.name,
    bio !== undefined ? (bio || null) : existing.bio,
    avatar_path,
    existing.id
  );

  res.json({ success: true });
});

module.exports = router;
