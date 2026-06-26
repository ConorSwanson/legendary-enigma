const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const requireAuth = require('../middleware/auth');
const { getDb } = require('../db');

function issueToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '90d' });
}

function safeUser(user, req) {
  const base = `${req.protocol}://${req.get('host')}`;
  const { password_hash, clerk_id, ...rest } = user;
  return {
    ...rest,
    avatar_url:     user.avatar_path     ? `${base}/uploads/${user.avatar_path}`     : null,
    background_url: user.background_path ? `${base}/uploads/${user.background_path}` : null,
  };
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const db = getDb();
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const hash = await bcrypt.hash(password, 12);
  const displayName = name?.trim() || email.split('@')[0];
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email.toLowerCase(), hash, displayName);

  res.status(201).json({ token: issueToken(result.lastInsertRowid) });
});

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !user.password_hash) return res.status(400).json({ error: 'Invalid email or password' });

  if (!await bcrypt.compare(password, user.password_hash)) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  res.json({ token: issueToken(user.id) });
});

// POST /api/auth/apple — Sign in with Apple
router.post('/apple', async (req, res) => {
  const { identityToken, fullName } = req.body;
  if (!identityToken) return res.status(400).json({ error: 'identityToken required' });

  try {
    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded) return res.status(400).json({ error: 'Invalid identity token' });

    const keysRes = await fetch('https://appleid.apple.com/auth/keys');
    const { keys } = await keysRes.json();
    const jwk = keys.find(k => k.kid === decoded.header.kid);
    if (!jwk) return res.status(400).json({ error: 'Unknown signing key' });

    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const payload = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
    });

    const appleId = payload.sub;
    const email = payload.email?.toLowerCase() || null;
    const db = getDb();

    let user = db.prepare('SELECT * FROM users WHERE apple_id = ?').get(appleId);

    if (!user && email) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (user) {
        db.prepare('UPDATE users SET apple_id = ? WHERE id = ?').run(appleId, user.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      }
    }

    if (!user) {
      const givenName = fullName?.givenName || '';
      const familyName = fullName?.familyName || '';
      const displayName = [givenName, familyName].filter(Boolean).join(' ')
        || email?.split('@')[0]
        || 'Climber';
      const result = db.prepare(
        'INSERT INTO users (apple_id, email, name) VALUES (?, ?, ?)'
      ).run(appleId, email, displayName);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    res.json({ token: issueToken(user.id) });
  } catch (e) {
    console.error('[Apple Auth]', e.message);
    res.status(400).json({ error: `Apple sign in failed: ${e.message}` });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(safeUser(req.user, req));
});

// POST /api/auth/device-token
router.post('/device-token', requireAuth, (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  getDb().prepare(
    'INSERT OR IGNORE INTO device_tokens (user_id, token) VALUES (?, ?)'
  ).run(req.user.id, token);
  res.json({ success: true });
});

// DELETE /api/auth/account
router.delete('/account', requireAuth, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  db.prepare('DELETE FROM device_tokens WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ success: true });
});

module.exports = router;
