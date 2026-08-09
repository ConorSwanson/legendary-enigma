const express = require('express');
const router = express.Router();

const STYLE = `
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

    nav {
      width: 100%;
      max-width: 640px;
      padding: 24px 0 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .nav-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--emerald); }
    .nav-name { font-size: 15px; font-weight: 600; letter-spacing: 0.02em; color: var(--text); }

    main {
      width: 100%;
      max-width: 640px;
      padding: 48px 0;
    }

    h1 {
      font-size: clamp(28px, 6vw, 40px);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }

    .updated {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 40px;
    }

    h2 {
      font-size: 18px;
      font-weight: 700;
      color: var(--emerald);
      margin: 32px 0 12px;
    }

    p, li {
      font-size: 15px;
      line-height: 1.7;
      color: var(--text);
      margin-bottom: 12px;
    }

    ul { padding-left: 20px; margin-bottom: 12px; }

    a { color: var(--sky); text-decoration: none; }
    a:hover { text-decoration: underline; }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      margin-top: 8px;
    }

    footer {
      margin-top: 56px;
      font-size: 12px;
      color: var(--muted);
      text-align: center;
    }
`;

function page(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Switchback</title>
  <style>${STYLE}</style>
</head>
<body>
  <nav>
    <div class="nav-dot"></div>
    <span class="nav-name">Switchback</span>
  </nav>
  <main>
    ${bodyHtml}
  </main>
  <footer>&copy; 2026 Switchback</footer>
</body>
</html>`;
}

const PRIVACY_BODY = `
  <h1>Privacy Policy</h1>
  <p class="updated">Last updated August 2026</p>

  <p>Switchback ("we", "our", "the app") tracks the summits you climb. This
  page explains what we collect, why, and how you can control or delete it.</p>

  <h2>What we collect</h2>
  <ul>
    <li><strong>Account info</strong> — your name and email, or your Sign in
    with Apple identifier if you use that instead. Passwords are stored as
    a salted hash, never in plain text.</li>
    <li><strong>Profile info</strong> — anything you choose to add: bio,
    profile photo, and profile background photo.</li>
    <li><strong>Climb data</strong> — the peaks you log, dates, notes, and
    any photos you attach. Photos may contain location metadata embedded by
    your device's camera; we display the photo as you uploaded it.</li>
    <li><strong>Activity</strong> — comments, likes, follows, and reports
    you submit.</li>
    <li><strong>Push notification token</strong> — only if you enable
    notifications, so we can deliver them through Apple's push service.</li>
  </ul>

  <h2>Photo library access</h2>
  <p>If you grant photo library access, the app can scan for photos taken
  near a peak you're logging, using location metadata already on your
  device, to suggest one instead of you having to search for it yourself.
  That scanning and matching happens on your device — we only receive the
  specific photo(s) you choose to actually attach to a climb, never your
  full library.</p>

  <h2>How we use it</h2>
  <p>To run the app: showing your feed, badges, and profile; sending
  notifications you've opted into; and responding to support requests or
  content reports. We don't sell your data, and we don't run ads or any
  third-party analytics/tracking SDKs.</p>

  <h2>Who we share it with</h2>
  <ul>
    <li><strong>Apple</strong> — Sign in with Apple (if you use it) and Apple
    Push Notification service (if you enable notifications).</li>
    <li><strong>Railway</strong> — our hosting provider, which stores the
    app's database and uploaded files.</li>
  </ul>
  <p>That's the complete list. We don't share data with advertisers,
  data brokers, or any other third party.</p>

  <h2>What other users can see</h2>
  <p>Climbs you mark <strong>Public</strong> are visible to anyone using the
  app; <strong>Followers</strong>-only climbs are visible to people who
  follow you; <strong>Private</strong> climbs are visible only to you.
  Comments and likes on a climb are visible to anyone who can see that
  climb. Your name, bio, and photos are visible to anyone who views your
  profile.</p>

  <h2>Blocking and reporting</h2>
  <p>You can block another user from the "•••" menu on their profile —
  once blocked, neither of you can see the other's climbs, comments, or
  profile, and any existing follow between you is removed. You can report
  a user, climb, or comment the same way; reports go directly to us for
  review.</p>

  <h2>Your data, your control</h2>
  <p>You can delete your account at any time from
  <strong>Profile → Delete Account</strong>. This permanently deletes your
  account and everything tied to it — climbs, photos, comments, likes,
  and notifications. This can't be undone. If you'd like a copy of your
  data instead, or have any other privacy question, contact us below.</p>

  <h2>Children's privacy</h2>
  <p>Switchback is not directed at children under 13, and we don't
  knowingly collect data from anyone under 13.</p>

  <h2>Changes to this policy</h2>
  <p>If this policy changes, we'll update the date at the top of this
  page.</p>

  <h2>Contact</h2>
  <div class="card">
    <p style="margin-bottom:0">Questions about this policy or your data?
    Email <a href="mailto:support@getswitchback.co">support@getswitchback.co</a>.</p>
  </div>
`;

const SUPPORT_BODY = `
  <h1>Support</h1>
  <p class="updated">We usually reply within a couple of days.</p>

  <h2>Report a user, climb, or comment</h2>
  <p>The fastest way is right in the app — tap the <strong>•••</strong> menu
  on any profile, climb, or comment and choose <strong>Report</strong>. You
  can also block anyone from their profile's <strong>•••</strong> menu, which
  immediately hides each other's content and removes any follow between
  you.</p>

  <h2>Something else — bugs, questions, feedback</h2>
  <div class="card">
    <p style="margin-bottom:0">Email us at
    <a href="mailto:support@getswitchback.co">support@getswitchback.co</a>
    and we'll get back to you.</p>
  </div>

  <h2>Delete your account</h2>
  <p>Go to <strong>Profile → Delete Account</strong> inside the app. This
  permanently deletes your account and all your climb data and can't be
  undone.</p>

  <h2>Privacy</h2>
  <p>See our <a href="/privacy">Privacy Policy</a> for what we collect and
  how it's used.</p>
`;

router.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(page('Privacy Policy', PRIVACY_BODY));
});

router.get('/support', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(page('Support', SUPPORT_BODY));
});

module.exports = router;
