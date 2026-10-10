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
    accessToken: response.body.data.tokens.accessToken as string,
    userId: response.body.data.user.id as string,
  };
}

async function createStaffToken() {
  const email = uniqueEmail("handover-staff");
  await prisma.user.create({
    data: {
      email,
      fullName: "Handover Staff",
      passwordHash: await hashPassword("securePass1"),
      role: Role.STAFF,
      status: AccountStatus.ACTIVE,
    },
  });
  const login = await request(app).post("/auth/login").send({
    email,
    password: "securePass1",
  });
  return login.body.data.tokens.accessToken as string;
}

async function seedApprovedHandoverPending() {
  const finder = await register("ho-finder");
  const claimant = await register("ho-claimant");
  const staffToken = await createStaffToken();
  const marker = `HO-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const found = await request(app)
    .post("/reports/found")
    .set("Authorization", `Bearer ${finder.accessToken}`)
    .send({
      category: "bags",
      title: `${marker} bag`,
      description: "internal",
      publicDescription: "Blue bag",
      location: "Library",
      foundAt: "2026-10-08T12:00:00.000Z",
      privateDetails: `${marker}-private`,
    });

  const claim = await request(app)
    .post("/claims")
    .set("Authorization", `Bearer ${claimant.accessToken}`)
    .send({
      foundReportId: found.body.data.report.id,
      message: "mine",
      evidence: "tag details",
    });

  const approve = await request(app)
    .post(`/staff/claims/${claim.body.data.claim.id}/decision`)
    .set("Authorization", `Bearer ${staffToken}`)
    .send({ decision: "APPROVE", notes: "Evidence matches" });
  expect(approve.status).toBe(200);

  const ready = await request(app)
    .post(`/staff/reports/found/${found.body.data.report.id}/ready-for-handover`)
    .set("Authorization", `Bearer ${staffToken}`)
    .send({ notes: "Desk ready" });
  expect(ready.status).toBe(200);
  expect(ready.body.data.report.status).toBe("HANDOVER_PENDING");

  return {
    finder,
    claimant,
    staffToken,
    foundId: found.body.data.report.id as string,
    claimId: claim.body.data.claim.id as string,
  };
}

describe("handover and return confirmation", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("blocks ordinary users from marking an item returned", async () => {
    const seeded = await seedApprovedHandoverPending();

    const denied = await request(app)
      .post(`/staff/reports/found/${seeded.foundId}/confirm-return`)
      .set("Authorization", `Bearer ${seeded.claimant.accessToken}`)
      .send({ notes: "I took it" });
    expect(denied.status).toBe(403);

    const unauthenticated = await request(app)
      .post(`/staff/reports/found/${seeded.foundId}/confirm-return`)
      .send({});
    expect(unauthenticated.status).toBe(401);
  });

  it("records staff return, optional recipient confirmation, and case closure", async () => {
    const seeded = await seedApprovedHandoverPending();
    const returnedAt = "2026-10-09T15:30:00.000Z";

    const receipt = await request(app)
      .post(`/claims/${seeded.claimId}/confirm-receipt`)
      .set("Authorization", `Bearer ${seeded.claimant.accessToken}`)
      .send({ notes: "Received at desk" });
    expect(receipt.status).toBe(200);
    expect(receipt.body.data.claim.recipientConfirmedAt).toBeTruthy();
    expect(receipt.body.data.alreadyConfirmed).toBe(false);

    const receiptEvents = await prisma.caseEvent.findMany({
      where: { claimId: seeded.claimId, eventType: "RETURN_CONFIRMED" },
    });
    expect(receiptEvents).toHaveLength(1);

    const stranger = await register("ho-stranger");
    const strangerReceipt = await request(app)
      .post(`/claims/${seeded.claimId}/confirm-receipt`)
      .set("Authorization", `Bearer ${stranger.accessToken}`)
      .send({});
    expect(strangerReceipt.status).toBe(403);

    const returned = await request(app)
      .post(`/staff/reports/found/${seeded.foundId}/confirm-return`)
      .set("Authorization", `Bearer ${seeded.staffToken}`)
      .send({ notes: "Handed to claimant", returnedAt });
    expect(returned.status).toBe(200);
    expect(returned.body.data.report.status).toBe("RETURNED");
    expect(returned.body.data.report.statusLabel).toBe("Returned");
    expect(returned.body.data.report.returnedAt).toBe(returnedAt);
    expect(returned.body.data.returnedAt).toBe(returnedAt);

    const handoverEvents = await prisma.caseEvent.findMany({
      where: { reportId: seeded.foundId, eventType: "HANDOVER_COMPLETED" },
    });
    expect(handoverEvents).toHaveLength(1);

    const closeTooEarlyDenied = await request(app)
      .post(`/staff/reports/found/${seeded.foundId}/confirm-return`)
      .set("Authorization", `Bearer ${seeded.staffToken}`)
      .send({});
    expect(closeTooEarlyDenied.status).toBe(409);

    const closed = await request(app)
      .post(`/staff/reports/found/${seeded.foundId}/close-case`)
      .set("Authorization", `Bearer ${seeded.staffToken}`)
      .send({ notes: "Case complete" });
    expect(closed.status).toBe(200);
    expect(closed.body.data.report.status).toBe("CLOSED");
    expect(closed.body.data.claim.status).toBe("CLOSED");

    const closeEvents = await prisma.caseEvent.findMany({
      where: { reportId: seeded.foundId, eventType: "CASE_CLOSED" },
    });
    expect(closeEvents).toHaveLength(1);

    const userClose = await request(app)
      .post(`/staff/reports/found/${seeded.foundId}/close-case`)
      .set("Authorization", `Bearer ${seeded.claimant.accessToken}`)
      .send({});
    expect(userClose.status).toBe(403);
  });
});
