const express = require('express');
const router = express.Router();
const { getMailer } = require('../utils/mailer');

// Where support-form submissions land -- deliberately not SMTP_NOTIFY (that's
// shared with beta-signup/report alerts); support requests go straight to a
// person, not a shared ops inbox.
const SUPPORT_NOTIFY_EMAIL = 'cswanson1@gmail.com';

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

    form { display: flex; flex-direction: column; gap: 14px; }

    label { font-size: 13px; font-weight: 600; color: var(--muted); }

    input, textarea {
      background: #0B1220;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 14px;
      color: var(--text);
      font-size: 15px;
      font-family: inherit;
      width: 100%;
    }
    input:focus, textarea:focus { outline: none; border-color: var(--emerald); }
    textarea { resize: vertical; min-height: 120px; }

    button {
      background: var(--emerald);
      color: #03071A;
      border: none;
      border-radius: 10px;
      padding: 14px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    button:hover { opacity: 0.9; }

    .banner {
      border-radius: 10px;
      padding: 14px 16px;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .banner.success { background: rgba(52, 211, 153, 0.12); border: 1px solid var(--emerald); color: var(--emerald); }
    .banner.error { background: rgba(248, 113, 113, 0.12); border: 1px solid #F87171; color: #F87171; }

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
    Reach us through the <a href="/support">Support page</a>.</p>
  </div>
`;

function supportBody(status) {
  const banner = status === 'sent'
    ? `<div class="banner success">Thanks — your message is on its way. We usually reply within a couple of days.</div>`
    : status === 'error'
      ? `<div class="banner error">Something went wrong sending that. Please try again, or email us directly.</div>`
      : '';

  return `
  <h1>Support</h1>
  <p class="updated">We usually reply within a couple of days.</p>

  ${banner}

  <h2>Report a user, climb, or comment</h2>
  <p>The fastest way is right in the app — tap the <strong>•••</strong> menu
  on any profile, climb, or comment and choose <strong>Report</strong>. You
  can also block anyone from their profile's <strong>•••</strong> menu, which
  immediately hides each other's content and removes any follow between
  you.</p>

  <h2>Something else — bugs, questions, feedback</h2>
  <div class="card">
    <form method="POST" action="/support">
      <div>
        <label for="name">Name</label>
        <input type="text" id="name" name="name" maxlength="200" />
      </div>
      <div>
        <label for="email">Email</label>
        <input type="email" id="email" name="email" maxlength="200" required />
      </div>
      <div>
        <label for="message">Message</label>
        <textarea id="message" name="message" maxlength="4000" required></textarea>
      </div>
      <button type="submit">Send</button>
    </form>
  </div>

  <h2>Delete your account</h2>
  <p>Go to <strong>Profile → Delete Account</strong> inside the app. This
  permanently deletes your account and all your climb data and can't be
  undone.</p>

  <h2>Privacy</h2>
  <p>See our <a href="/privacy">Privacy Policy</a> for what we collect and
  how it's used.</p>
`;
}

async function sendSupportEmail({ name, email, message }) {
  const mailer = getMailer();
  if (!mailer) return false;
  await mailer.sendMail({
    from: `"Switchback Support" <${process.env.SMTP_USER}>`,
    to: SUPPORT_NOTIFY_EMAIL,
    replyTo: email,
    subject: `Switchback support request from ${name || email}`,
    text: `From: ${name || '(no name)'} <${email}>\n\n${message}`,
  });
  return true;
}

router.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(page('Privacy Policy', PRIVACY_BODY));
});

router.get('/support', (req, res) => {
  const status = req.query.sent ? 'sent' : req.query.error ? 'error' : null;
  res.setHeader('Content-Type', 'text/html');
  res.send(page('Support', supportBody(status)));
});

router.post('/support', express.urlencoded({ extended: false }), async (req, res) => {
  const name = (req.body.name || '').trim().slice(0, 200);
  const email = (req.body.email || '').trim().slice(0, 200);
  const message = (req.body.message || '').trim().slice(0, 4000);

  if (!email || !message) return res.redirect('/support?error=1');

  try {
    const sent = await sendSupportEmail({ name, email, message });
    res.redirect(sent ? '/support?sent=1' : '/support?error=1');
  } catch (err) {
    console.error('[Support] Email send failed:', err.message);
    res.redirect('/support?error=1');
  }
});

module.exports = router;
