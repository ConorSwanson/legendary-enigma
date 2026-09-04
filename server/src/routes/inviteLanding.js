const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

const APP_STORE_URL = 'https://apps.apple.com/us/app/switchback-summit-tracker/id6784754996';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function shell({ title, description, image, url, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  ${image ? `<meta property="og:image" content="${image}" />` : ''}
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  ${image ? `<meta name="twitter:image" content="${image}" />` : ''}
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
      padding: 56px 20px 60px;
    }
    .wrap { width: 100%; max-width: 400px; }
    .app-icon {
      width: 72px; height: 72px; border-radius: 16px;
      display: block; margin: 0 auto 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,.35);
    }
    .eyebrow {
      text-align: center;
      font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
      color: var(--sky); margin-bottom: 10px;
    }
    h1 {
      text-align: center;
      font-size: 24px; font-weight: 800; line-height: 1.25; letter-spacing: -.01em;
      margin-bottom: 28px;
    }
    h1 b { color: var(--emerald); }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 22px;
    }
    .peak-name { font-size: 19px; font-weight: 800; margin-bottom: 3px; }
    .peak-sub { font-size: 12.5px; color: var(--muted); font-weight: 600; margin-bottom: 16px; }
    .row {
      display: flex; align-items: center; gap: 8px;
      font-size: 13.5px; font-weight: 700; color: var(--emerald);
      padding-top: 14px; border-top: 1px solid var(--border);
    }
    .row.muted { color: var(--muted); font-weight: 600; }
    .quote {
      margin-top: 14px; padding-left: 11px;
      border-left: 2px solid var(--border);
      font-size: 13px; font-style: italic; color: #C3CCD4; line-height: 1.5;
    }
    .btn {
      display: block; width: 100%; text-align: center;
      padding: 15px; border-radius: 12px;
      font-size: 15px; font-weight: 700; text-decoration: none;
      border: none; cursor: pointer; font-family: inherit;
    }
    .btn-primary { background: var(--emerald); color: #03170F; }
    .btn-secondary {
      background: transparent; color: var(--sky);
      border: 1.4px solid rgba(56,189,248,.35);
      margin-top: 10px;
    }
    .stack { display: flex; flex-direction: column; }
    .footnote { text-align: center; font-size: 11.5px; color: var(--muted); margin-top: 16px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrap">
    <img class="app-icon" src="/public/app-icon.png" alt="Switchback" />
    ${body}
  </div>
</body>
</html>`;
}

// GET /i/:token — public landing page for a climb invite's share link.
// Auto-attempts the switchback:// custom scheme (silent no-op if the app
// isn't installed); "Get the App" copies the token to the clipboard first
// so the app can pick the invite back up right after signup, without any
// Universal Links / Apple Developer Portal configuration.
router.get('/:token', (req, res) => {
  const db = getDb();
  const invite = db.prepare('SELECT * FROM climb_invites WHERE share_token = ?').get(req.params.token);

  if (!invite) {
    return res.status(404).send(shell({
      title: 'Invite not found — Switchback',
      description: 'This invite link is no longer valid.',
      url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      body: `
        <div class="eyebrow">SWITCHBACK</div>
        <h1>This invite link isn't valid</h1>
        <p class="footnote">It may have been removed, or the link was copied incorrectly.</p>
        <a class="btn btn-primary" style="margin-top:20px;" href="${APP_STORE_URL}">Get Switchback</a>
      `,
    }));
  }

  const mountain = db.prepare('SELECT id, name, elevation, range, state FROM mountains WHERE id = ?').get(invite.mountain_id);
  const inviter = db.prepare('SELECT name FROM users WHERE id = ?').get(invite.inviter_id);
  const host = req.protocol + '://' + req.get('host');
  const inviterName = inviter?.name || 'Someone';
  const dateLabel = formatDate(invite.climb_date);
  const locationLabel = [mountain?.range, mountain?.state].filter(Boolean).join(' · ');

  const title = `${inviterName} invited you to climb ${mountain?.name || 'a peak'}`;
  const description = dateLabel
    ? `Join them on ${dateLabel} — track it on Switchback.`
    : 'No date set yet — track it on Switchback.';
  const image = `${host}/api/badges/${invite.mountain_id}/png?climbed=0`;
  const url = `${host}${req.originalUrl}`;

  const body = `
    <div class="eyebrow">SWITCHBACK</div>
    <h1><b>${esc(inviterName)}</b> invited you to climb</h1>
    <div class="card">
      <div class="peak-name">${esc(mountain?.name || 'A peak')}</div>
      <div class="peak-sub">${mountain?.elevation ? `${mountain.elevation.toLocaleString()} FT` : ''}${locationLabel ? ` · ${esc(locationLabel.toUpperCase())}` : ''}</div>
      ${dateLabel
        ? `<div class="row">📅 ${esc(dateLabel)}</div>`
        : `<div class="row muted">No date yet — just floating the idea</div>`}
      ${invite.note ? `<div class="quote">"${esc(invite.note)}"</div>` : ''}
    </div>
    <div class="stack">
      <button class="btn btn-primary" id="openBtn">Open in Switchback</button>
      <button class="btn btn-secondary" id="getBtn">Don't have it? Get the app</button>
    </div>
    <p class="footnote">Already on Switchback? Tap "Open" above. New here? Tapping "Get the app" brings this invite along once you sign up.</p>
    <script>
      var TOKEN = ${JSON.stringify(invite.share_token)};
      var SCHEME_URL = 'switchback://invite/' + TOKEN;
      var STORE_URL = ${JSON.stringify(APP_STORE_URL)};

      function openInApp() { window.location.href = SCHEME_URL; }

      document.getElementById('openBtn').addEventListener('click', openInApp);

      document.getElementById('getBtn').addEventListener('click', function () {
        var marker = 'switchback-invite:' + TOKEN;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(marker).catch(function () {});
          }
        } catch (e) {}
        window.location.href = STORE_URL;
      });

      // Best-effort silent attempt in case the app is already installed --
      // does nothing visible if it isn't (iOS just ignores the scheme).
      setTimeout(openInApp, 250);
    </script>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(shell({ title, description, image, url, body }));
});

module.exports = router;
