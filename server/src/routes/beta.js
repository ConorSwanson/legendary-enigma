const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { getMailer } = require('../utils/mailer');

async function sendSignupAlert(email) {
  const mailer = getMailer();
  if (!mailer) return;
  const notify = process.env.SMTP_NOTIFY || process.env.SMTP_USER;
  await mailer.sendMail({
    from: `"Switchback" <${process.env.SMTP_USER}>`,
    to: notify,
    subject: '🏔️ New beta signup',
    text: `${email} just joined the Switchback beta waitlist.`,
    html: `<p><strong>${email}</strong> just joined the Switchback beta waitlist.</p>`,
  });
}

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Switchback — Track Every Summit</title>
  <meta name="description" content="Track every summit you climb. Earn badges, log ascents, and connect with other climbers — starting with all 58 Colorado 14ers. Now available on the App Store." />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:      #03071A;
      --card:    #111827;
      --emerald: #34D399;
      --sky:     #38BDF8;
      --text:    #F9FAFB;
      --muted:   #9CA3AF;
      --border:  #1F2937;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 20px 60px;
    }

    /* ── Hero ── */
    .hero {
      width: 100%;
      max-width: 640px;
      text-align: center;
      padding: 72px 0 48px;
    }

    .logo {
      height: 40px;
      width: auto;
      margin: 0 auto 40px;
      display: block;
    }

    .eyebrow {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--emerald);
      margin-bottom: 16px;
    }

    h1 {
      font-size: clamp(32px, 7vw, 52px);
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.02em;
      margin-bottom: 20px;
    }

    h1 span { color: var(--emerald); }

    .subtitle {
      font-size: 17px;
      color: var(--muted);
      line-height: 1.6;
      max-width: 460px;
      margin: 0 auto 40px;
    }

    /* ── CTA ── */
    .cta-btn {
      display: inline-block;
      padding: 15px 28px;
      background: var(--emerald);
      color: #03071A;
      font-size: 15px;
      font-weight: 700;
      border: none;
      border-radius: 12px;
      text-decoration: none;
      white-space: nowrap;
      transition: opacity 0.2s;
    }
    .cta-btn:hover { opacity: 0.88; }

    .form-note {
      font-size: 12px;
      color: var(--muted);
      margin-top: 14px;
      text-align: center;
    }

    /* ── Features ── */
    .features {
      width: 100%;
      max-width: 640px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-top: 72px;
    }

    .feature {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }

    .feature-icon {
      font-size: 24px;
      margin-bottom: 10px;
    }

    .feature h3 {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 6px;
    }

    .feature p {
      font-size: 13px;
      color: var(--muted);
      line-height: 1.5;
    }

    /* ── Stats strip ── */
    .stats {
      width: 100%;
      max-width: 640px;
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-top: 56px;
      padding-top: 40px;
      border-top: 1px solid var(--border);
      flex-wrap: wrap;
    }

    .stat-item { text-align: center; }
    .stat-value {
      font-size: 28px;
      font-weight: 800;
      color: var(--emerald);
      display: block;
    }
    .stat-label {
      font-size: 12px;
      color: var(--muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* ── Footer ── */
    footer {
      margin-top: 56px;
      font-size: 12px;
      color: var(--muted);
      text-align: center;
    }
    footer a { color: var(--muted); text-decoration: underline; }
    footer a:hover { color: var(--text); }
  </style>
</head>
<body>

  <div class="hero">
    <img src="/public/switchback-logo.png" alt="Switchback" class="logo" />

    <p class="eyebrow">Now Available</p>
    <h1>Track every<br/><span>summit you climb.</span></h1>
    <p class="subtitle">
      Log every ascent, earn peak badges, and follow other climbers —
      starting with all 58 Colorado 14ers, and beyond.
    </p>

    <a href="https://apps.apple.com/us/app/switchback-summit-tracker/id6784754996" class="cta-btn" target="_blank" rel="noopener noreferrer">
      Download on the App Store →
    </a>
    <p class="form-note">Free. Requires an iPhone running iOS 17 or later.</p>
  </div>

  <div class="features">
    <div class="feature">
      <div class="feature-icon">🏔️</div>
      <h3>Every Summit</h3>
      <p>Starts with all 58 Colorado 14ers, but tracks any peak you climb — log each summit with date, notes, and photos.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">🏅</div>
      <h3>Peak Badges</h3>
      <p>Earn a unique badge for every summit. Track your collection as you go.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">📊</div>
      <h3>Stats & History</h3>
      <p>Total elevation gained, unique peaks, ascent streaks, and your full climb history.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">👥</div>
      <h3>Social Feed</h3>
      <p>Follow other climbers, see recent summits, and like each other's ascents.</p>
    </div>
  </div>

  <div class="stats">
    <div class="stat-item">
      <span class="stat-value">58</span>
      <span class="stat-label">Colorado 14ers included</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">14,440</span>
      <span class="stat-label">Highest ft (Elbert)</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">Free</span>
      <span class="stat-label">Always</span>
    </div>
  </div>

  <footer>
    &copy; 2026 Switchback &middot; <a href="/privacy">Privacy Policy</a>
  </footer>
</body>
</html>`;

function renderLandingPage(_req, res) {
  res.setHeader('Content-Type', 'text/html');
  res.send(PAGE);
}

// GET /beta — landing page
router.get('/', renderLandingPage);

// POST /api/beta/signup — capture email
router.post('/signup', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const normalized = email.toLowerCase().trim();
  try {
    const result = getDb().prepare(
      'INSERT OR IGNORE INTO beta_signups (email) VALUES (?)'
    ).run(normalized);
    if (result.changes > 0) {
      sendSignupAlert(normalized).catch(err =>
        console.error('[Beta] Email notification failed:', err.message)
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not save email' });
  }
});

// GET /api/beta/list?secret=X — export signups (protected by env secret)
router.get('/list', (req, res) => {
  const secret = process.env.BETA_LIST_SECRET;
  if (!secret || req.query.secret !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const rows = getDb().prepare(
    'SELECT email, created_at FROM beta_signups ORDER BY created_at DESC'
  ).all();
  res.json({ count: rows.length, signups: rows });
});

module.exports = router;
module.exports.renderLandingPage = renderLandingPage;
