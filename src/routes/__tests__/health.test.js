const request = require("supertest");
const express = require("express");
const healthRouter = require("../health");

jest.mock("../../config/db");
jest.mock("../../config/redis");
jest.mock("../../services/logger");

const db = require("../../config/db");
const redis = require("../../config/redis");

const app = express();
app.use("/", healthRouter);

describe("Health Routes", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("GET /health", () => {
    test("returns 200 and healthy status when all deps up", async () => {
      db.raw.mockResolvedValue([{ health_check: 1 }]);
      redis.ping.mockResolvedValue("PONG");
      redis.info.mockResolvedValue("used_memory_human:10.5M");
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.dependencies.database.status).toBe("healthy");
      expect(res.body.dependencies.cache.status).toBe("healthy");
    });

    test("returns 503 when DB is down", async () => {
      db.raw.mockRejectedValue(new Error("Connection refused"));
      redis.ping.mockResolvedValue("PONG");
      redis.info.mockResolvedValue("");
      const res = await request(app).get("/health");
      expect(res.status).toBe(503);
      expect(res.body.status).toBe("degraded");
      expect(res.body.dependencies.database.status).toBe("unhealthy");
    });

    test("includes version and uptime in response", async () => {
      db.raw.mockResolvedValue(true);
      redis.ping.mockResolvedValue("PONG");
      redis.info.mockResolvedValue("");
      const res = await request(app).get("/health");
      expect(res.body.uptime).toBeDefined();
      expect(res.body.version).toBeDefined();
    });
  });

  describe("GET /ready", () => {
    test("always returns 200", async () => {
      const res = await request(app).get("/ready");
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });
  });

  describe("GET /live", () => {
    test("returns alive status with uptime", async () => {
      const res = await request(app).get("/live");
      expect(res.status).toBe(200);
      expect(res.body.alive).toBe(true);
    });
  });
});
