// A block hides content in both directions -- neither party should see the
// other's climbs, comments, or show up in each other's search results.
// Used as a NOT IN (...) subquery clause everywhere feed/search/comments
// pull rows by user_id.
const BLOCKED_EITHER_DIRECTION_SQL = `(
  SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
  UNION
  SELECT blocker_id FROM user_blocks WHERE blocked_id = ?
)`;

function isBlockedEitherDirection(db, userAId, userBId) {
  return !!db.prepare(
    'SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)'
  ).get(userAId, userBId, userBId, userAId);
}

function hasBlocked(db, blockerId, blockedId) {
  return !!db.prepare(
    'SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?'
  ).get(blockerId, blockedId);
}

module.exports = { BLOCKED_EITHER_DIRECTION_SQL, isBlockedEitherDirection, hasBlocked };
