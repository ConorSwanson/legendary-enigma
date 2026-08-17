const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { getMailer } = require('../utils/mailer');
const { page } = require('./legal');

const RESET_BASE_URL = 'https://www.getswitchback.co';

async function sendResetEmail(email, token) {
  const mailer = getMailer();
  if (!mailer) return false;
  const link = `${RESET_BASE_URL}/reset-password?token=${token}`;
  await mailer.sendMail({
    from: `"Switchback" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset your Switchback password',
    text: `Someone (hopefully you) requested a password reset for your Switchback account.\n\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    html: `<p>Someone (hopefully you) requested a password reset for your Switchback account.</p><p><a href="${link}">Reset your password</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
  });
  return true;
}

function forgotPasswordBody(status) {
  const banner = status === 'sent'
    ? `<div class="banner success">If that email has an account, a reset link is on its way. Check your inbox.</div>`
    : status === 'error'
      ? `<div class="banner error">Something went wrong sending that. Please try again.</div>`
      : '';

  return `
  <h1>Reset your password</h1>
  <p class="updated">We'll email you a link to set a new one.</p>

  ${banner}

  <div class="card">
    <form method="POST" action="/forgot-password">
      <div>
        <label for="email">Email</label>
        <input type="email" id="email" name="email" maxlength="200" required autofocus />
      </div>
      <button type="submit">Send reset link</button>
    </form>
  </div>
`;
}

function resetPasswordBody({ token, status, valid }) {
  const banner = status === 'error'
    ? `<div class="banner error">Passwords didn't match, or were too short (8 characters minimum). Try again.</div>`
    : '';

  if (!valid) {
    return `
    <h1>Reset your password</h1>
    <div class="banner error">This link has expired or was already used.</div>
    <p><a href="/forgot-password">Request a new one</a>.</p>
  `;
  }

  return `
  <h1>Choose a new password</h1>

  ${banner}

  <div class="card">
    <form method="POST" action="/reset-password">
      <input type="hidden" name="token" value="${token}" />
      <div>
        <label for="password">New password</label>
        <input type="password" id="password" name="password" minlength="8" required autofocus />
      </div>
      <div>
        <label for="confirm">Confirm new password</label>
        <input type="password" id="confirm" name="confirm" minlength="8" required />
      </div>
      <button type="submit">Reset password</button>
    </form>
  </div>
`;
}

function resetSuccessBody() {
  return `
  <h1>Password reset</h1>
  <div class="banner success">Your password has been changed. Open the Switchback app and sign in with your new password.</div>
`;
}

router.get('/forgot-password', (req, res) => {
  const status = req.query.sent ? 'sent' : req.query.error ? 'error' : null;
  res.setHeader('Content-Type', 'text/html');
  res.send(page('Reset your password', forgotPasswordBody(status)));
});

router.post('/forgot-password', express.urlencoded({ extended: false }), async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase().slice(0, 200);
  if (!email) return res.redirect('/forgot-password?error=1');

  try {
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    // Always report success either way -- don't let this page reveal
    // whether a given email has an account.
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
      db.prepare(
        `INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+1 hour'))`
      ).run(user.id, token);
      await sendResetEmail(email, token);
    }
    res.redirect('/forgot-password?sent=1');
  } catch (err) {
    console.error('[PasswordReset] Request failed:', err.message);
    res.redirect('/forgot-password?error=1');
  }
});

router.get('/reset-password', (req, res) => {
  const token = (req.query.token || '').toString();
  const db = getDb();
  const reset = db.prepare(
    `SELECT id FROM password_resets WHERE token = ? AND expires_at > datetime('now')`
  ).get(token);

  res.setHeader('Content-Type', 'text/html');
  res.send(page('Reset your password', resetPasswordBody({ token, status: null, valid: !!reset })));
});

router.post('/reset-password', express.urlencoded({ extended: false }), async (req, res) => {
  const token = (req.body.token || '').toString();
  const password = req.body.password || '';
  const confirm = req.body.confirm || '';

  const db = getDb();
  const reset = db.prepare(
    `SELECT id, user_id FROM password_resets WHERE token = ? AND expires_at > datetime('now')`
  ).get(token);

  if (!reset) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(page('Reset your password', resetPasswordBody({ token, status: null, valid: false })));
  }

  if (password.length < 8 || password !== confirm) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(page('Reset your password', resetPasswordBody({ token, status: 'error', valid: true })));
  }

  const hash = await bcrypt.hash(password, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, reset.user_id);
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(reset.user_id);

  res.setHeader('Content-Type', 'text/html');
  res.send(page('Password reset', resetSuccessBody()));
});

module.exports = router;
