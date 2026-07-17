const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>14ers Tracker — Join the Beta</title>
  <meta name="description" content="Track every Colorado 14er summit. Earn badges, log climbs, and connect with other climbers. Join the beta." />
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

    /* ── Nav ── */
    nav {
      width: 100%;
      max-width: 640px;
      padding: 24px 0 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .nav-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: var(--emerald);
    }
    .nav-name {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--text);
    }

    /* ── Hero ── */
    .hero {
      width: 100%;
      max-width: 640px;
      text-align: center;
      padding: 72px 0 48px;
    }

    .badge-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 96px; height: 96px;
      background: var(--card);
      border-radius: 22px;
      border: 1px solid var(--border);
      margin-bottom: 32px;
      box-shadow: 0 0 40px rgba(52,211,153,0.15);
    }

    .mountain-svg {
      width: 60px; height: 60px;
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

    /* ── Form ── */
    .form-wrap {
      display: flex;
      gap: 10px;
      width: 100%;
      max-width: 440px;
      margin: 0 auto;
    }

    .form-wrap input[type="email"] {
      flex: 1;
      padding: 14px 18px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--text);
      font-size: 15px;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-wrap input[type="email"]::placeholder { color: var(--muted); }
    .form-wrap input[type="email"]:focus { border-color: var(--emerald); }

    .form-wrap button {
      padding: 14px 22px;
      background: var(--emerald);
      color: #03071A;
      font-size: 15px;
      font-weight: 700;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.2s;
    }
    .form-wrap button:hover { opacity: 0.88; }
    .form-wrap button:disabled { opacity: 0.5; cursor: default; }

    .form-note {
      font-size: 12px;
      color: var(--muted);
      margin-top: 12px;
      text-align: center;
    }

    #success-msg {
      display: none;
      align-items: center;
      gap: 10px;
      background: rgba(52,211,153,0.1);
      border: 1px solid rgba(52,211,153,0.3);
      border-radius: 12px;
      padding: 14px 20px;
      font-size: 15px;
      font-weight: 500;
      color: var(--emerald);
      max-width: 440px;
      margin: 0 auto;
    }

    #error-msg {
      display: none;
      font-size: 13px;
      color: #F87171;
      margin-top: 10px;
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
  </style>
</head>
<body>

  <nav>
    <div class="nav-dot"></div>
    <span class="nav-name">14ers Tracker</span>
  </nav>

  <div class="hero">
    <div class="badge-wrap">
      <svg class="mountain-svg" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 8L52 48H8L30 8Z" fill="#1F2937"/>
        <path d="M30 8L38 26L30 22L22 26L30 8Z" fill="#E5E7EB"/>
        <path d="M18 48L30 22L42 48H18Z" fill="#374151"/>
        <path d="M8 48L18 30L26 38L18 48H8Z" fill="#4B5563"/>
        <circle cx="30" cy="8" r="2" fill="#34D399"/>
      </svg>
    </div>

    <p class="eyebrow">iOS Beta — Coming Soon</p>
    <h1>Track every<br/><span>Colorado summit.</span></h1>
    <p class="subtitle">
      Log your 14er ascents, earn peak badges, and follow other climbers.
      Built for serious Colorado hikers. Free beta launching soon.
    </p>

    <form id="signup-form">
      <div class="form-wrap">
        <input type="email" id="email-input" placeholder="your@email.com" required autocomplete="email" />
        <button type="submit" id="submit-btn">Join Beta</button>
      </div>
      <p class="form-note">No spam. Just a link when the beta is ready.</p>
      <p id="error-msg"></p>
    </form>

    <div id="success-msg">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#34D399"/><path d="M5 9l3 3 5-5" stroke="#03071A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      You're on the list! We'll email you when the beta opens.
    </div>
  </div>

  <div class="features">
    <div class="feature">
      <div class="feature-icon">🏔️</div>
      <h3>All 58 Peaks</h3>
      <p>Every Colorado 14er in one place. Log each summit with date, notes, and photos.</p>
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
      <span class="stat-label">Peaks tracked</span>
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
    &copy; 2026 14ers Tracker &nbsp;·&nbsp; Colorado
  </footer>

  <script>
    const form = document.getElementById('signup-form');
    const emailInput = document.getElementById('email-input');
    const submitBtn = document.getElementById('submit-btn');
    const successMsg = document.getElementById('success-msg');
    const errorMsg = document.getElementById('error-msg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Joining…';
      errorMsg.style.display = 'none';

      try {
        const res = await fetch('/api/beta/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Something went wrong');
        form.style.display = 'none';
        successMsg.style.display = 'flex';
      } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Join Beta';
      }
    });
  </script>
</body>
</html>`;

// GET /beta — landing page
router.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(PAGE);
});

// POST /api/beta/signup — capture email
router.post('/signup', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  try {
    getDb().prepare(
      'INSERT OR IGNORE INTO beta_signups (email) VALUES (?)'
    ).run(email.toLowerCase().trim());
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
