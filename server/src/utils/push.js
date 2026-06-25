const { getDb } = require('../db');

let _provider = null;
let _apn = null;

function getProvider() {
  if (_provider) return _provider;
  const { APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID } = process.env;
  if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) return null;
  if (!_apn) _apn = require('@parse/node-apn');
  _provider = new _apn.Provider({
    token: {
      key: Buffer.from(APNS_KEY.replace(/\\n/g, '\n')),
      keyId: APNS_KEY_ID,
      teamId: APNS_TEAM_ID,
    },
    production: process.env.NODE_ENV === 'production',
  });
  return _provider;
}

async function pushToUser(userId, { title, body }) {
  const provider = getProvider();
  if (!provider) return;
  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!bundleId) return;

  const db = getDb();
  const tokens = db.prepare('SELECT token FROM device_tokens WHERE user_id = ?').all(userId);
  if (!tokens.length) return;

  const note = new _apn.Notification();
  note.expiry = Math.floor(Date.now() / 1000) + 3600;
  note.sound = 'default';
  note.alert = { title, body };
  note.topic = bundleId;

  for (const { token } of tokens) {
    try {
      const result = await provider.send(note, token);
      if (result.failed && result.failed.length > 0) {
        const reason = result.failed[0].response?.reason;
        if (reason === 'BadDeviceToken' || reason === 'Unregistered') {
          db.prepare('DELETE FROM device_tokens WHERE token = ?').run(token);
        }
      }
    } catch (e) {
      console.warn('[Push] Send error:', e.message);
    }
  }
}

module.exports = { pushToUser };
