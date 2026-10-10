import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { disconnectDatabase, prisma } from "../src/db/prisma";
import { createRateLimiter, resetRateLimitBuckets } from "../src/middleware/rateLimit";

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@campus.test`;
}

describe("security hardening", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("sets baseline security headers on responses", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("rejects oversized JSON bodies safely", async () => {
    const huge = "x".repeat(120_000);
    const response = await request(app)
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send(`{"email":"a@b.co","password":"${huge}"}`);

    expect([400, 413]).toContain(response.status);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(JSON.stringify(response.body)).not.toMatch(/stack|prisma|passwordHash/i);
  });

  it("keeps auth failures generic and does not leak whether email exists", async () => {
    const email = uniqueEmail("sec-missing");
    const missing = await request(app).post("/auth/login").send({
      email,
      password: "securePass1",
    });
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe("INVALID_CREDENTIALS");

    await request(app).post("/auth/register").send({
      email,
      password: "securePass1",
      fullName: "Security User",
    });

    const wrongPassword = await request(app).post("/auth/login").send({
      email,
      password: "wrong-password-1",
    });
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(wrongPassword.body.error.message).toBe(missing.body.error.message);
  });

  it("enforces staff authorization server-side for staff-only routes", async () => {
    const email = uniqueEmail("sec-user");
    const registered = await request(app).post("/auth/register").send({
      email,
      password: "securePass1",
      fullName: "Ordinary User",
    });
    const token = registered.body.data.tokens.accessToken as string;

    const staffDenied = await request(app)
      .get("/staff/reports")
      .set("Authorization", `Bearer ${token}`);
    expect(staffDenied.status).toBe(403);

    const verificationDenied = await request(app)
      .get("/verification/claims")
      .set("Authorization", `Bearer ${token}`);
    expect(verificationDenied.status).toBe(403);
  });

  it("rate-limits abusive clients when enabled", () => {
    resetRateLimitBuckets();
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 2,
      keyPrefix: "test-sec",
      forceEnabled: true,
    });

    const req = { ip: "203.0.113.10", header: () => undefined, socket: {} } as never;
    const res = {} as never;
    let limitedCode: string | undefined;

    limiter(req, res, () => undefined);
    limiter(req, res, () => undefined);
    limiter(req, res, (err?: unknown) => {
      if (err && typeof err === "object" && "code" in err) {
        limitedCode = (err as { code: string }).code;
      }
    });

    expect(limitedCode).toBe("RATE_LIMITED");
    resetRateLimitBuckets();
  });
});
