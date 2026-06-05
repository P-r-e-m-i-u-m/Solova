const db = require("../connection");
const logger = require("../../services/logger");

/**
 * Optimized user queries leveraging new composite indexes
 * All queries verified with EXPLAIN ANALYZE
 */
const UserQueries = {
  findActiveByEmail: async (email) => {
    const { rows } = await db.query(
      "SELECT id, email, role, created_at FROM users WHERE email = $1 AND status = $2 AND deleted_at IS NULL LIMIT 1",
      [email.toLowerCase(), "active"]
    );
    return rows[0] || null;
  },

  findRecentSessions: async (userId, limit = 10) => {
    const { rows } = await db.query(
      "SELECT id, ip_address, created_at, expires_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
      [userId, limit]
    );
    return rows;
  },

  findActiveOrders: async (userId, cursor = null, limit = 20) => {
    const params = [userId, limit + 1];
    let sql = "SELECT * FROM orders WHERE user_id = $1 AND status NOT IN ('cancelled', 'refunded', 'expired') ORDER BY created_at DESC LIMIT $2";
    if (cursor) { sql += " OFFSET $3"; params.push(cursor); }
    const { rows } = await db.query(sql, params);
    const hasMore = rows.length > limit;
    logger.info("Active orders fetched", { userId, count: rows.length });
    return { orders: rows.slice(0, limit), hasMore };
  },

  searchByMetadata: async (key, value) => {
    const { rows } = await db.query(
      "SELECT * FROM events WHERE metadata @> $1::jsonb ORDER BY created_at DESC LIMIT 100",
      [JSON.stringify({ [key]: value })]
    );
    return rows;
  }
};

module.exports = UserQueries;
// build: 1780662950
