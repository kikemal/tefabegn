import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { disconnectDatabase } from "../src/db/prisma";

describe("GET /health", () => {
  it("returns a healthy status payload", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: "ok",
        service: "tefabign-backend",
      },
    });
    expect(typeof response.body.data.timestamp).toBe("string");
  });
});

describe("GET /health/ready", () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  it("reports ready when the database is reachable", async () => {
    const app = createApp();

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: "ready",
        database: "up",
      },
    });
  });
});

describe("GET /", () => {
  it("returns basic service metadata", async () => {
    const app = createApp();

    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.health).toBe("/health");
  });
});

describe("unknown routes", () => {
  it("returns a safe 404 payload", async () => {
    const app = createApp();

    const response = await request(app).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });
});
