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
    // Which APNs gateway to use is decided by the app's own aps-environment
    // entitlement (sandbox while it's a development-signed build, switched
    // to production automatically once Xcode archives for TestFlight/App
    // Store) -- NOT by NODE_ENV, which Railway sets to 'production' for any
    // deployed service regardless of how the client app is signed. Using
    // NODE_ENV here silently sent every push to the wrong gateway: the
    // server would accept the send with no error, but a sandbox-issued
    // device token is invalid on the production gateway (and vice versa),
    // so nothing ever arrived. Flip APNS_PRODUCTION=true only once the iOS
    // entitlement itself is switched to 'production'.
    production: process.env.APNS_PRODUCTION === 'true',
  });
  return _provider;
}

async function pushToUser(userId, { title, body, climbId }) {
  const provider = getProvider();
  if (!provider) return;
  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!bundleId) return;

  const db = getDb();
  const tokens = db.prepare('SELECT token FROM device_tokens WHERE user_id = ?').all(userId);
  if (!tokens.length) {
    console.warn(`[Push] No device tokens registered for user ${userId} — skipping "${title}"`);
    return;
  }

  const note = new _apn.Notification();
  note.expiry = Math.floor(Date.now() / 1000) + 3600;
  note.sound = 'default';
  note.alert = { title, body };
  note.topic = bundleId;
  if (climbId) note.payload = { climbId };

  for (const { token } of tokens) {
    try {
      const result = await provider.send(note, token);
      if (result.failed && result.failed.length > 0) {
        const reason = result.failed[0].response?.reason;
        // Log every rejection reason -- previously only the two handled
        // below were ever surfaced, so a mismatched topic/key/environment
        // failed with zero visibility anywhere.
        console.warn(`[Push] APNs rejected token ...${token.slice(-8)}: ${reason}`);
        if (reason === 'BadDeviceToken' || reason === 'Unregistered') {
          db.prepare('DELETE FROM device_tokens WHERE token = ?').run(token);
        }
      } else {
        console.log(`[Push] Sent "${title}" to token ...${token.slice(-8)}`);
      }
    } catch (e) {
      console.warn('[Push] Send error:', e.message);
    }
  }
}

module.exports = { pushToUser };
