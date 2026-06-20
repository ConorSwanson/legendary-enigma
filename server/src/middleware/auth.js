const { ClerkExpressWithAuth, clerkClient } = require('@clerk/clerk-sdk-node');
const { getDb } = require('../db');

const withAuth = ClerkExpressWithAuth();

async function requireAuth(req, res, next) {
  withAuth(req, res, async (err) => {
    if (err || !req.auth?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.auth;
    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE clerk_id = ?').get(userId);

    if (!user) {
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        const name = [clerkUser.firstName, clerkUser.lastName]
          .filter(Boolean).join(' ')
          || clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0]
          || 'Climber';

        const result = db.prepare(
          'INSERT INTO users (clerk_id, name) VALUES (?, ?)'
        ).run(userId, name);

        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

        // Auto-adopt orphaned climbs (legacy single-user data) for the first user
        const { c } = db.prepare('SELECT COUNT(*) AS c FROM climbs WHERE user_id IS NULL').get();
        if (c > 0) {
          const existingUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
          if (existingUsers === 1) {
            db.prepare('UPDATE climbs SET user_id = ? WHERE user_id IS NULL').run(user.id);
          }
        }
      } catch (e) {
        console.error('Clerk user sync failed:', e.message);
        return res.status(500).json({ error: 'Auth sync failed' });
      }
    }

    req.user = user;
    next();
  });
}

module.exports = requireAuth;
