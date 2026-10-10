import { ReportStatus, ReportType } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { disconnectDatabase, prisma } from "../src/db/prisma";
import { createRateLimiter, resetRateLimitBuckets } from "../src/middleware/rateLimit";
import { PUBLIC_RECENT_FOUND_ALLOWED_KEYS } from "../src/reports/public/mappers";
import { registerUser, uniqueMarker } from "./helpers";

const app = createApp();

/** Far-future timestamps so this suite's rows win `foundAt` ordering against shared DB data. */
const FAR_FUTURE = "2101-06-15T12:00:00.000Z";

const FORBIDDEN_KEYS = [
  "description",
  "privateDetails",
  "identifier",
  "imageRef",
  "reporterId",
  "returnedAt",
  "updatedAt",
  "email",
  "passwordHash",
  "evidence",
] as const;

describe("GET /reports/public/recent-found", () => {
  let accessToken = "";
  let marker = "";
  let secretMarker = "";

  beforeAll(async () => {
    await prisma.$connect();
    const user = await registerUser(app, "pub-feed");
    accessToken = user.accessToken;
    marker = uniqueMarker("PUB");
    secretMarker = `SECRET-${marker}`;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  async function createFound(overrides: Record<string, unknown> = {}) {
    const response = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        category: "bags",
        title: `${marker} found item`,
        description: `Internal notes ${secretMarker}-desc`,
        publicDescription: `Public blurb ${marker}`,
        location: `${marker} Cafeteria`,
        foundAt: FAR_FUTURE,
        identifier: `${marker}-TAG`,
        privateDetails: `${secretMarker}-private`,
        imageRef: `private/found/${marker}.jpg`,
        ...overrides,
      });
    expect(response.status).toBe(201);
    return response.body.data.report as { id: string; shareRef: string };
  }

  it("allows anonymous successful access", async () => {
    await createFound({ title: `${marker} anon access` });

    const response = await request(app).get("/reports/public/recent-found").query({ limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.reports)).toBe(true);
    expect(response.body.data.reports.some((r: { title: string }) => r.title.includes(marker))).toBe(
      true,
    );
  });

  it("defaults limit to 8 and accepts valid custom and maximum limits", async () => {
    for (let i = 0; i < 10; i += 1) {
      await createFound({
        title: `${marker} limit-${i}`,
        foundAt: new Date(Date.UTC(2101, 5, 1 + i, 12)).toISOString(),
      });
    }

    const defaults = await request(app).get("/reports/public/recent-found");
    expect(defaults.status).toBe(200);
    expect(defaults.body.data.reports).toHaveLength(8);

    const custom = await request(app).get("/reports/public/recent-found").query({ limit: 3 });
    expect(custom.status).toBe(200);
    expect(custom.body.data.reports).toHaveLength(3);

    const max = await request(app).get("/reports/public/recent-found").query({ limit: 20 });
    expect(max.status).toBe(200);
    expect(max.body.data.reports).toHaveLength(20);
  });

  it("rejects invalid limit values", async () => {
    for (const limit of [0, 21, -1, "abc", 1.5]) {
      const response = await request(app).get("/reports/public/recent-found").query({ limit });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns only eligible FOUND statuses (ACTIVE and POSSIBLE_MATCH)", async () => {
    const active = await createFound({ title: `${marker} status-active` });
    const possible = await createFound({ title: `${marker} status-possible` });
    const cancelled = await createFound({ title: `${marker} status-cancelled` });
    const closed = await createFound({ title: `${marker} status-closed` });

    await prisma.itemReport.update({
      where: { id: possible.id },
      data: { status: ReportStatus.POSSIBLE_MATCH },
    });
    await request(app)
      .post(`/reports/found/${cancelled.id}/cancel`)
      .set("Authorization", `Bearer ${accessToken}`);
    await prisma.itemReport.update({
      where: { id: closed.id },
      data: { status: ReportStatus.CLOSED },
    });

    const response = await request(app).get("/reports/public/recent-found").query({ limit: 20 });
    expect(response.status).toBe(200);

    const ours = response.body.data.reports.filter((r: { title: string }) =>
      r.title.includes(`${marker} status-`),
    );
    const ids = ours.map((r: { id: string }) => r.id);
    const statuses = ours.map((r: { status: string }) => r.status);

    expect(ids).toContain(active.id);
    expect(ids).toContain(possible.id);
    expect(ids).not.toContain(cancelled.id);
    expect(ids).not.toContain(closed.id);
    expect(statuses.every((s: string) => s === "ACTIVE" || s === "POSSIBLE_MATCH")).toBe(true);
    expect(ours.every((r: { type: string }) => r.type === "FOUND")).toBe(true);
  });

  it("orders by foundAt descending, then createdAt descending", async () => {
    // Use 2102 dates so these four always outrank other shared-DB fixtures.
    const olderFound = await createFound({
      title: `${marker} order-older-found`,
      foundAt: "2102-10-01T10:00:00.000Z",
    });
    const newerFound = await createFound({
      title: `${marker} order-newer-found`,
      foundAt: "2102-12-01T10:00:00.000Z",
    });
    const sameFoundEarlier = await createFound({
      title: `${marker} order-same-a`,
      foundAt: "2102-11-01T10:00:00.000Z",
    });
    await new Promise((resolve) => setTimeout(resolve, 25));
    const sameFoundLater = await createFound({
      title: `${marker} order-same-b`,
      foundAt: "2102-11-01T10:00:00.000Z",
    });

    const response = await request(app).get("/reports/public/recent-found").query({ limit: 20 });
    expect(response.status).toBe(200);

    const ours = response.body.data.reports.filter((r: { title: string }) =>
      r.title.includes(`${marker} order-`),
    );
    expect(ours).toHaveLength(4);
    const ids = ours.map((r: { id: string }) => r.id);

    expect(ids.indexOf(newerFound.id)).toBeLessThan(ids.indexOf(sameFoundLater.id));
    expect(ids.indexOf(sameFoundLater.id)).toBeLessThan(ids.indexOf(sameFoundEarlier.id));
    expect(ids.indexOf(sameFoundEarlier.id)).toBeLessThan(ids.indexOf(olderFound.id));
  });

  it("returns only the allowlisted public fields and omits private data", async () => {
    await createFound({
      title: `${marker} allowlist`,
      foundAt: "2103-01-01T12:00:00.000Z",
      description: `NEVER_LEAK_DESC_${secretMarker}`,
      privateDetails: `NEVER_LEAK_PRIVATE_${secretMarker}`,
      identifier: `NEVER_LEAK_ID_${marker}`,
      imageRef: `private/NEVER_LEAK_${marker}.jpg`,
    });

    const response = await request(app).get("/reports/public/recent-found").query({ limit: 20 });
    expect(response.status).toBe(200);

    const report = response.body.data.reports.find((r: { title: string }) =>
      r.title.includes(`${marker} allowlist`),
    );
    expect(report).toBeDefined();

    const keys = Object.keys(report).sort();
    expect(keys).toEqual([...PUBLIC_RECENT_FOUND_ALLOWED_KEYS].sort());

    for (const key of FORBIDDEN_KEYS) {
      expect(report).not.toHaveProperty(key);
    }

    const raw = JSON.stringify(response.body);
    expect(raw).not.toContain(secretMarker);
    expect(raw).not.toContain("NEVER_LEAK_DESC_");
    expect(raw).not.toContain("NEVER_LEAK_PRIVATE_");
    expect(raw).not.toContain("private/NEVER_LEAK_");
  });

  it("returns an empty reports array when no eligible found items exist", async () => {
    // Temporarily hide all eligible FOUND rows (shared test DB), then restore.
    const eligible = await prisma.itemReport.findMany({
      where: {
        type: ReportType.FOUND,
        status: { in: [ReportStatus.ACTIVE, ReportStatus.POSSIBLE_MATCH] },
      },
      select: { id: true, status: true },
    });

    try {
      if (eligible.length > 0) {
        await prisma.itemReport.updateMany({
          where: { id: { in: eligible.map((row) => row.id) } },
          data: { status: ReportStatus.CANCELLED },
        });
      }

      const response = await request(app).get("/reports/public/recent-found");
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toEqual([]);
    } finally {
      for (const row of eligible) {
        await prisma.itemReport.update({
          where: { id: row.id },
          data: { status: row.status },
        });
      }
    }
  });

  it("keeps authenticated search and found detail routes protected", async () => {
    const created = await createFound({ title: `${marker} auth-guard` });

    const searchAnon = await request(app).get("/reports/search");
    expect(searchAnon.status).toBe(401);

    const detailAnon = await request(app).get(`/reports/found/${created.id}`);
    expect(detailAnon.status).toBe(401);

    const searchAuth = await request(app)
      .get("/reports/search")
      .query({ q: marker, type: ReportType.FOUND })
      .set("Authorization", `Bearer ${accessToken}`);
    expect(searchAuth.status).toBe(200);

    const detailAuth = await request(app)
      .get(`/reports/found/${created.id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(detailAuth.status).toBe(200);
  });

  it("rate-limits abusive public-feed clients when enabled (project convention)", () => {
    resetRateLimitBuckets();
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 2,
      keyPrefix: "public-feed-test",
      forceEnabled: true,
    });

    const req = { ip: "198.51.100.20", header: () => undefined, socket: {} } as never;
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
