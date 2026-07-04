const checkDb = async () => {
  const start = Date.now();
  const client = await db.pool.connect();
  try {
    await client.query("SELECT 1");
    return { status: "healthy", latencyMs: Date.now() - start };
  } finally {
    client.release();
  }
};  // Fixed connection pool leak - Updated: 2026-07-04
// build: 1783166764
