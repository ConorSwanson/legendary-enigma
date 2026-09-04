const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');
const { pushToUser } = require('../utils/push');
const { isBlockedEitherDirection } = require('../utils/blocks');

function avatarUrl(req, path) {
  if (!path) return null;
  return `${req.protocol}://${req.get('host')}/uploads/${path}`;
}

function serializeInvite(req, db, invite) {
  const mountain = db.prepare('SELECT id, name, elevation, range, state FROM mountains WHERE id = ?').get(invite.mountain_id);
  const inviter = db.prepare('SELECT id, name, avatar_path FROM users WHERE id = ?').get(invite.inviter_id);
  const recipients = db.prepare(`
    SELECT cir.id, cir.status, cir.via_link, cir.created_at, cir.responded_at,
           u.id AS user_id, u.name AS user_name, u.avatar_path AS user_avatar_path
    FROM climb_invite_recipients cir
    JOIN users u ON u.id = cir.user_id
    WHERE cir.invite_id = ?
    ORDER BY cir.created_at ASC
  `).all(invite.id);

  const myRecipient = recipients.find(r => r.user_id === req.user.id);

  return {
    id: invite.id,
    mountain_id: invite.mountain_id,
    mountain_name: mountain?.name,
    mountain_elevation: mountain?.elevation,
    mountain_range: mountain?.range,
    mountain_state: mountain?.state,
    inviter_id: invite.inviter_id,
    inviter_name: inviter?.name,
    inviter_avatar_url: avatarUrl(req, inviter?.avatar_path),
    climb_date: invite.climb_date,
    note: invite.note,
    share_token: invite.inviter_id === req.user.id ? invite.share_token : undefined,
    created_at: invite.created_at,
    is_inviter: invite.inviter_id === req.user.id,
    my_status: myRecipient?.status ?? null,
    recipients: recipients.map(r => ({
      id: r.id,
      status: r.status,
      via_link: !!r.via_link,
      responded_at: r.responded_at,
      user_id: r.user_id,
      user_name: r.user_name,
      user_avatar_url: avatarUrl(req, r.user_avatar_path),
    })),
  };
}

// Shared by both the named-recipient "respond" flow and the share-link
// "claim" flow, so accepting always has exactly one effect: mark the
// recipient row, add the peak to their wishlist, notify the inviter.
function applyResponse(req, db, invite, recipientRow, status) {
  db.prepare(
    "UPDATE climb_invite_recipients SET status = ?, responded_at = datetime('now') WHERE id = ?"
  ).run(status, recipientRow.id);

  if (status === 'accepted') {
    db.prepare(
      'INSERT OR IGNORE INTO mountain_wishlist (user_id, mountain_id) VALUES (?, ?)'
    ).run(req.user.id, invite.mountain_id);
  }

  if (invite.inviter_id !== req.user.id) {
    try {
      const type = status === 'accepted' ? 'invite_accepted'
                 : status === 'declined' ? 'invite_declined'
                 : 'invite_maybe';
      db.prepare(
        `INSERT INTO notifications (user_id, from_user_id, type, invite_id) VALUES (?, ?, ?, ?)`
      ).run(invite.inviter_id, req.user.id, type, invite.id);
      const fromUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
      const mountain = db.prepare('SELECT name FROM mountains WHERE id = ?').get(invite.mountain_id);
      const verb = status === 'accepted' ? 'accepted your invite to climb'
                 : status === 'declined' ? "can't make it to climb"
                 : 'might join climbing';
      pushToUser(invite.inviter_id, {
        title: status === 'accepted' ? 'Invite Accepted' : 'Invite Response',
        body: `${fromUser?.name || 'Someone'} ${verb} ${mountain?.name || 'a peak'}`,
        inviteId: invite.id,
      }).catch(() => {});
    } catch (_) {}
  }
}

// POST /api/invites — propose a climb, optionally naming followers and/or
// generating a share link for people not on the app yet.
router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  const { mountain_id, climb_date, note, recipient_user_ids, generate_link } = req.body;

  if (!mountain_id) return res.status(400).json({ error: 'mountain_id is required' });
  const mountain = db.prepare('SELECT id FROM mountains WHERE id = ?').get(mountain_id);
  if (!mountain) return res.status(404).json({ error: 'Mountain not found' });

  const shareToken = generate_link ? crypto.randomBytes(32).toString('hex') : null;

  const result = db.prepare(
    'INSERT INTO climb_invites (mountain_id, inviter_id, climb_date, note, share_token) VALUES (?, ?, ?, ?, ?)'
  ).run(mountain_id, req.user.id, climb_date || null, note || null, shareToken);
  const inviteId = result.lastInsertRowid;

  const ids = Array.isArray(recipient_user_ids)
    ? [...new Set(recipient_user_ids)].filter(id => id !== req.user.id)
    : [];

  for (const recipientId of ids) {
    if (isBlockedEitherDirection(db, req.user.id, recipientId)) continue;
    const recipient = db.prepare('SELECT id FROM users WHERE id = ?').get(recipientId);
    if (!recipient) continue;

    db.prepare(
      'INSERT OR IGNORE INTO climb_invite_recipients (invite_id, user_id, status, via_link) VALUES (?, ?, ?, 0)'
    ).run(inviteId, recipientId, 'pending');

    try {
      db.prepare(
        "INSERT INTO notifications (user_id, from_user_id, type, invite_id) VALUES (?, ?, 'climb_invite', ?)"
      ).run(recipientId, req.user.id, inviteId);
      const fromUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
      const mountainRow = db.prepare('SELECT name FROM mountains WHERE id = ?').get(mountain_id);
      pushToUser(recipientId, {
        title: 'Climb Invite',
        body: `${fromUser?.name || 'Someone'} wants to climb ${mountainRow?.name || 'a peak'} with you`,
        inviteId,
      }).catch(() => {});
    } catch (_) {}
  }

  const invite = db.prepare('SELECT * FROM climb_invites WHERE id = ?').get(inviteId);
  res.status(201).json(serializeInvite(req, db, invite));
});

// GET /api/invites — invites I sent and invites I've been named on
router.get('/', requireAuth, (req, res) => {
  const db = getDb();

  const sentIds = db.prepare('SELECT id FROM climb_invites WHERE inviter_id = ? ORDER BY created_at DESC')
    .all(req.user.id).map(r => r.id);
  const receivedIds = db.prepare(`
    SELECT ci.id FROM climb_invites ci
    JOIN climb_invite_recipients cir ON cir.invite_id = ci.id
    WHERE cir.user_id = ?
    ORDER BY ci.created_at DESC
  `).all(req.user.id).map(r => r.id);

  const load = id => serializeInvite(req, db, db.prepare('SELECT * FROM climb_invites WHERE id = ?').get(id));
  res.json({
    sent: sentIds.map(load),
    received: receivedIds.map(load),
  });
});

// GET /api/invites/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const invite = db.prepare('SELECT * FROM climb_invites WHERE id = ?').get(req.params.id);
  if (!invite) return res.status(404).json({ error: 'Invite not found' });

  const isInviter = invite.inviter_id === req.user.id;
  const isRecipient = !!db.prepare('SELECT 1 FROM climb_invite_recipients WHERE invite_id = ? AND user_id = ?')
    .get(invite.id, req.user.id);
  if (!isInviter && !isRecipient) return res.status(403).json({ error: 'Forbidden' });

  res.json(serializeInvite(req, db, invite));
});

// POST /api/invites/:id/respond — a named recipient accepts/declines/maybes
router.post('/:id/respond', requireAuth, (req, res) => {
  const db = getDb();
  const { status } = req.body;
  if (!['accepted', 'maybe', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'status must be accepted, maybe, or declined' });
  }

  const invite = db.prepare('SELECT * FROM climb_invites WHERE id = ?').get(req.params.id);
  if (!invite) return res.status(404).json({ error: 'Invite not found' });

  const recipientRow = db.prepare('SELECT * FROM climb_invite_recipients WHERE invite_id = ? AND user_id = ?')
    .get(invite.id, req.user.id);
  if (!recipientRow) return res.status(404).json({ error: 'You were not invited to this climb' });

  // Resubmitting the same status (e.g. a retried request) shouldn't
  // re-notify the inviter -- only an actual change of answer should.
  if (recipientRow.status !== status) {
    applyResponse(req, db, invite, recipientRow, status);
  }
  res.json(serializeInvite(req, db, invite));
});

// POST /api/invites/claim — the share-link path: a signed-in user (fresh
// signup or otherwise) redeems a token from a text/link invite. Treated as
// an implicit accept -- by the time someone has installed the app and
// signed up off this link, "maybe" isn't a meaningful extra step.
router.post('/claim', requireAuth, (req, res) => {
  const db = getDb();
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const invite = db.prepare('SELECT * FROM climb_invites WHERE share_token = ?').get(token);
  if (!invite) return res.status(404).json({ error: 'Invite not found' });
  if (invite.inviter_id === req.user.id) return res.json(serializeInvite(req, db, invite));

  let recipientRow = db.prepare('SELECT * FROM climb_invite_recipients WHERE invite_id = ? AND user_id = ?')
    .get(invite.id, req.user.id);

  if (!recipientRow) {
    const result = db.prepare(
      'INSERT INTO climb_invite_recipients (invite_id, user_id, status, via_link) VALUES (?, ?, ?, 1)'
    ).run(invite.id, req.user.id, 'pending');
    recipientRow = db.prepare('SELECT * FROM climb_invite_recipients WHERE id = ?').get(result.lastInsertRowid);
  }

  if (recipientRow.status === 'pending') {
    applyResponse(req, db, invite, recipientRow, 'accepted');
  }

  res.json(serializeInvite(req, db, invite));
});

module.exports = router;
