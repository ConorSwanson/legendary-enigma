const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireAuth = require('../middleware/auth');
const { getMailer } = require('../utils/mailer');

const VALID_TARGET_TYPES = new Set(['user', 'climb', 'comment']);

// A report nobody sees isn't a moderation system -- best-effort email so
// there's actually someone to act on it. Never blocks the response on
// failure; reports are already durably stored in content_reports either way.
async function sendReportAlert(report) {
  const mailer = getMailer();
  if (!mailer) return;
  const notify = process.env.SMTP_NOTIFY || process.env.SMTP_USER;
  await mailer.sendMail({
    from: `"Switchback" <${process.env.SMTP_USER}>`,
    to: notify,
    subject: `🚩 New report: ${report.target_type} #${report.target_id}`,
    text: `User #${report.reporterId} reported ${report.target_type} #${report.target_id}.\n\nReason: ${report.reason}\n${report.details ? `Details: ${report.details}` : ''}`,
  });
}

// POST /api/reports — flag a user, climb, or comment for review.
// { target_type: 'user'|'climb'|'comment', target_id, reason, details? }
router.post('/', requireAuth, (req, res) => {
  const { target_type, target_id, reason, details } = req.body;

  if (!VALID_TARGET_TYPES.has(target_type)) {
    return res.status(400).json({ error: 'target_type must be one of user, climb, comment' });
  }
  const targetId = Number(target_id);
  if (!targetId) return res.status(400).json({ error: 'target_id is required' });
  if (!reason || !reason.trim()) return res.status(400).json({ error: 'reason is required' });

  const trimmedReason = reason.trim();
  const trimmedDetails = details?.trim() || null;

  getDb().prepare(
    'INSERT INTO content_reports (reporter_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, target_type, targetId, trimmedReason, trimmedDetails);

  sendReportAlert({
    reporterId: req.user.id, target_type, target_id: targetId, reason: trimmedReason, details: trimmedDetails,
  }).catch(err => console.error('[Reports] Email notification failed:', err.message));

  res.status(201).json({ success: true });
});

module.exports = router;
