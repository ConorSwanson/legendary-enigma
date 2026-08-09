const nodemailer = require('nodemailer');

// Shared by beta-signup alerts and content-report alerts -- returns null
// (caller just skips sending) when SMTP isn't configured, so email stays
// optional in dev without every alert call site needing its own guard.
function getMailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

module.exports = { getMailer };
