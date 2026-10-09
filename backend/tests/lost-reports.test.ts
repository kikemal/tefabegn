import { AccountStatus, Role } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { hashPassword } from "../src/auth/passwords";
import { disconnectDatabase, prisma } from "../src/db/prisma";

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@campus.test`;
}

async function register(prefix: string) {
  const email = uniqueEmail(prefix);
  const response = await request(app)
    .post("/auth/register")
    .send({
      email,
      password: "securePass1",
      fullName: `${prefix} User`,
    });
  return {
    email,
    accessToken: response.body.data.tokens.accessToken as string,
    userId: response.body.data.user.id as string,
  };
}

const lostPayload = {
  category: "electronics",
  title: "Black laptop",
  description: "Dell laptop lost near library",
  location: "Main Library",
  lostAt: "2026-10-08T15:30:00.000Z",
  identifier: "SN-ABC-123",
  privateDetails: "sticker with name inside lid",
  imageRef: "uploads/demo-laptop.jpg",
};

describe("lost item reports", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("creates a lost report for the authenticated owner", async () => {
    const user = await register("create-lost");

    const response = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(lostPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.report.type).toBe("LOST");
    expect(response.body.data.report.status).toBe("ACTIVE");
    expect(response.body.data.report.reporterId).toBe(user.userId);
    expect(response.body.data.report.privateDetails).toBe(lostPayload.privateDetails);
    expect(response.body.data.report.shareRef).toMatch(/^LF-/);

    const events = await prisma.caseEvent.findMany({
      where: { reportId: response.body.data.report.id },
    });
    expect(events.some((event) => event.eventType === "LOST_REPORTED")).toBe(true);
  });

  it("rejects unauthenticated create and invalid categories", async () => {
    const unauthorized = await request(app).post("/reports/lost").send(lostPayload);
    expect(unauthorized.status).toBe(401);

    const user = await register("bad-category");
    const invalid = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ ...lostPayload, category: "spaceship" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lets owners list and update their reports, and hides private fields from others", async () => {
    const owner = await register("owner-lost");
    const other = await register("other-lost");

    const created = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send(lostPayload);
    const reportId = created.body.data.report.id as string;

    const mine = await request(app)
      .get("/reports/lost/mine")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.reports.some((r: { id: string }) => r.id === reportId)).toBe(true);
    expect(
      mine.body.data.reports.find((r: { id: string }) => r.id === reportId).privateDetails,
    ).toBe(lostPayload.privateDetails);

    const otherView = await request(app)
      .get(`/reports/lost/${reportId}`)
      .set("Authorization", `Bearer ${other.accessToken}`);
    expect(otherView.status).toBe(200);
    expect(otherView.body.data.report.title).toBe(lostPayload.title);
    expect(otherView.body.data.report.privateDetails).toBeUndefined();
    expect(otherView.body.data.report.identifier).toBeUndefined();

    const forbiddenUpdate = await request(app)
      .patch(`/reports/lost/${reportId}`)
      .set("Authorization", `Bearer ${other.accessToken}`)
      .send({ title: "Hijacked title" });
    expect(forbiddenUpdate.status).toBe(403);

    const updated = await request(app)
      .patch(`/reports/lost/${reportId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ title: "Updated laptop title", location: "Science Building" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.report.title).toBe("Updated laptop title");
    expect(updated.body.data.report.location).toBe("Science Building");
  });

  it("allows owners to cancel and close their own reports", async () => {
    const user = await register("close-lost");

    const created = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(lostPayload);
    const reportId = created.body.data.report.id as string;

    const cancelled = await request(app)
      .post(`/reports/lost/${reportId}/cancel`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.report.status).toBe("CANCELLED");

    const cannotUpdate = await request(app)
      .patch(`/reports/lost/${reportId}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ title: "Nope" });
    expect(cannotUpdate.status).toBe(409);

    const created2 = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ ...lostPayload, title: "Second item" });
    const reportId2 = created2.body.data.report.id as string;

    const closed = await request(app)
      .post(`/reports/lost/${reportId2}/close`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(closed.status).toBe(200);
    expect(closed.body.data.report.status).toBe("CLOSED");
  });

  it("allows staff to review lost reports including private evidence", async () => {
    const owner = await register("staff-target");
    const created = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send(lostPayload);
    const reportId = created.body.data.report.id as string;

    const staffEmail = uniqueEmail("staff-review");
    await prisma.user.create({
      data: {
        email: staffEmail,
        fullName: "Staff Reviewer",
        passwordHash: await hashPassword("securePass1"),
        role: Role.STAFF,
        status: AccountStatus.ACTIVE,
      },
    });
    const staffLogin = await request(app).post("/auth/login").send({
      email: staffEmail,
      password: "securePass1",
    });
    const staffToken = staffLogin.body.data.tokens.accessToken as string;

    const list = await request(app)
      .get("/reports/lost")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.reports.some((r: { id: string }) => r.id === reportId)).toBe(true);

    const detail = await request(app)
      .get(`/reports/lost/${reportId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.report.privateDetails).toBe(lostPayload.privateDetails);

    const studentDenied = await request(app)
      .get("/reports/lost")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(studentDenied.status).toBe(403);
  });
});
