/**
 * @file health.js
 * @description Health check routes with DB, Redis and memory monitoring
 * @updated 2026-05-05
 */
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const redis = require("../config/redis");
const logger = require("../services/logger");

const checkDb = async () => {
  const start = Date.now();
  try {
    await db.raw("SELECT 1 AS health_check");
    return { status: "healthy", latencyMs: Date.now() - start, type: "postgresql" };
  } catch (err) {
    logger.error("DB health check failed", err);
    return { status: "unhealthy", error: err.message, latencyMs: Date.now() - start };
  }
};

const checkRedis = async () => {
  const start = Date.now();
  try {
    const pong = await redis.ping();
    const info = await redis.info("memory").catch(() => null);
    const usedMemory = info ? info.match(/used_memory_human:(.+)/)?.[1]?.trim() : null;
    return { status: pong === "PONG" ? "healthy" : "unhealthy", latencyMs: Date.now() - start, type: "redis", memoryUsed: usedMemory };
  } catch (err) {
    logger.error("Redis health check failed", err);
    return { status: "unhealthy", error: err.message, latencyMs: Date.now() - start };
  }
};

const checkMemory = () => {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const rssM = Math.round(used.rss / 1024 / 1024);
  const heapPercent = (heapUsedMB / heapTotalMB) * 100;
  return { heapUsedMB, heapTotalMB, rssMB: rssM, heapUsedPercent: heapPercent.toFixed(1), status: heapPercent > 90 ? "warning" : "healthy" };
};

router.get("/health", async (req, res) => {
  const [dbStatus, redisStatus] = await Promise.all([checkDb(), checkRedis()]);
  const memoryStatus = checkMemory();
  const isHealthy = dbStatus.status === "healthy" && redisStatus.status === "healthy";
  const status = isHealthy ? "healthy" : "degraded";
  const response = {
    status,
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    dependencies: { database: dbStatus, cache: redisStatus },
    system: { memory: memoryStatus, nodeVersion: process.version }
  };
  logger.info("Health check", { status, dbLatency: dbStatus.latencyMs, redisLatency: redisStatus.latencyMs });
  res.status(isHealthy ? 200 : 503).json(response);
});

router.get("/ready", (req, res) => {
  res.status(200).json({ ready: true, timestamp: new Date().toISOString(), pid: process.pid });
});

router.get("/live", (req, res) => {
  res.status(200).json({ alive: true, uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
});

module.exports = router;
// build: 1777979706
