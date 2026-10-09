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

const foundPayload = {
  category: "bags",
  title: "Blue backpack",
  description: "Internal notes: contains student ID card with name",
  publicDescription: "Blue backpack found near cafeteria entrance",
  location: "Student Cafeteria",
  foundAt: "2026-10-08T12:00:00.000Z",
  identifier: "tag-red-42",
  privateDetails: "name tag sewn inside: Abebe",
  imageRef: "private/found/backpack-1.jpg",
};

describe("found item reports", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("creates a found report with public and private fields separated", async () => {
    const finder = await register("create-found");

    const response = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send(foundPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.report.type).toBe("FOUND");
    expect(response.body.data.report.status).toBe("ACTIVE");
    expect(response.body.data.report.reporterId).toBe(finder.userId);
    expect(response.body.data.report.publicDescription).toBe(foundPayload.publicDescription);
    expect(response.body.data.report.privateDetails).toBe(foundPayload.privateDetails);
    expect(response.body.data.report.imageRef).toBe(foundPayload.imageRef);
    expect(response.body.data.report.shareRef).toMatch(/^FF-/);

    const events = await prisma.caseEvent.findMany({
      where: { reportId: response.body.data.report.id },
    });
    expect(events.some((event) => event.eventType === "FOUND_REPORTED")).toBe(true);
  });

  it("does not leak private found evidence to other users", async () => {
    const finder = await register("finder-priv");
    const other = await register("other-found");

    const created = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send(foundPayload);
    const reportId = created.body.data.report.id as string;

    const otherView = await request(app)
      .get(`/reports/found/${reportId}`)
      .set("Authorization", `Bearer ${other.accessToken}`);

    expect(otherView.status).toBe(200);
    expect(otherView.body.data.report.type).toBe("FOUND");
    expect(otherView.body.data.report.title).toBe(foundPayload.title);
    expect(otherView.body.data.report.publicDescription).toBe(foundPayload.publicDescription);
    expect(otherView.body.data.report.location).toBe(foundPayload.location);

    expect(otherView.body.data.report.description).toBeUndefined();
    expect(otherView.body.data.report.privateDetails).toBeUndefined();
    expect(otherView.body.data.report.identifier).toBeUndefined();
    expect(otherView.body.data.report.imageRef).toBeUndefined();

    const bodyText = JSON.stringify(otherView.body);
    expect(bodyText).not.toContain(foundPayload.privateDetails);
    expect(bodyText).not.toContain(foundPayload.identifier);
    expect(bodyText).not.toContain(foundPayload.imageRef);
    expect(bodyText).not.toContain(foundPayload.description);
  });

  it("lets finders manage their own found reports", async () => {
    const finder = await register("manage-found");

    const created = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send(foundPayload);
    const reportId = created.body.data.report.id as string;

    const mine = await request(app)
      .get("/reports/found/mine")
      .set("Authorization", `Bearer ${finder.accessToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.reports.some((r: { id: string }) => r.id === reportId)).toBe(true);

    const updated = await request(app)
      .patch(`/reports/found/${reportId}`)
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({ publicDescription: "Updated public blurb", location: "Library lobby" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.report.publicDescription).toBe("Updated public blurb");
    expect(updated.body.data.report.location).toBe("Library lobby");

    const closed = await request(app)
      .post(`/reports/found/${reportId}/close`)
      .set("Authorization", `Bearer ${finder.accessToken}`);
    expect(closed.status).toBe(200);
    expect(closed.body.data.report.status).toBe("CLOSED");
  });

  it("allows staff to review private found evidence and blocks non-staff list access", async () => {
    const finder = await register("staff-found-target");
    const created = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send(foundPayload);
    const reportId = created.body.data.report.id as string;

    const staffEmail = uniqueEmail("staff-found");
    await prisma.user.create({
      data: {
        email: staffEmail,
        fullName: "Staff Found Reviewer",
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
      .get("/reports/found")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.reports.some((r: { id: string }) => r.id === reportId)).toBe(true);

    const detail = await request(app)
      .get(`/reports/found/${reportId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.report.privateDetails).toBe(foundPayload.privateDetails);
    expect(detail.body.data.report.imageRef).toBe(foundPayload.imageRef);
    expect(detail.body.data.report.description).toBe(foundPayload.description);

    const denied = await request(app)
      .get("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`);
    expect(denied.status).toBe(403);
  });

  it("rejects unauthenticated create", async () => {
    const response = await request(app).post("/reports/found").send(foundPayload);
    expect(response.status).toBe(401);
  });
});
