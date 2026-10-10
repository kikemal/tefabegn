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
  const email = uniqueEmail("notif-staff");
  await prisma.user.create({
    data: {
      email,
      fullName: "Notification Staff",
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

describe("notifications", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("requires auth and keeps notification text free of private evidence", async () => {
    const denied = await request(app).get("/notifications");
    expect(denied.status).toBe(401);

    const finder = await register("notif-finder");
    const claimant = await register("notif-claimant");
    const staffToken = await createStaffToken();
    const marker = `NF-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const secret = `${marker}-SECRET-EVIDENCE`;

    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "bags",
        title: `${marker} bag`,
        description: `internal ${secret}`,
        publicDescription: "Blue bag",
        location: "Library",
        foundAt: "2026-10-08T12:00:00.000Z",
        privateDetails: secret,
        identifier: `${marker}-IMEI`,
      });
    expect(found.status).toBe(201);

    const claim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${claimant.accessToken}`)
      .send({
        foundReportId: found.body.data.report.id,
        message: "mine",
        evidence: secret,
      });
    expect(claim.status).toBe(201);

    const finderNotes = await request(app)
      .get("/notifications")
      .set("Authorization", `Bearer ${finder.accessToken}`);
    expect(finderNotes.status).toBe(200);
    expect(finderNotes.body.data.notifications.length).toBeGreaterThanOrEqual(1);
    expect(finderNotes.body.data.notifications[0].type).toBe("CLAIM_SUBMITTED");
    expect(JSON.stringify(finderNotes.body.data.notifications)).not.toContain(secret);

    const approve = await request(app)
      .post(`/staff/claims/${claim.body.data.claim.id}/decision`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ decision: "APPROVE", notes: "ok" });
    expect(approve.status).toBe(200);

    const claimantNotes = await request(app)
      .get("/notifications")
      .query({ unreadOnly: "true" })
      .set("Authorization", `Bearer ${claimant.accessToken}`);
    expect(claimantNotes.status).toBe(200);
    const approved = claimantNotes.body.data.notifications.find(
      (n: { type: string }) => n.type === "CLAIM_APPROVED",
    );
    expect(approved).toBeDefined();
    expect(JSON.stringify(approved)).not.toContain(secret);

    const unread = await request(app)
      .get("/notifications/unread-count")
      .set("Authorization", `Bearer ${claimant.accessToken}`);
    expect(unread.status).toBe(200);
    expect(unread.body.data.unreadCount).toBeGreaterThanOrEqual(1);

    const marked = await request(app)
      .post(`/notifications/${approved.id}/read`)
      .set("Authorization", `Bearer ${claimant.accessToken}`);
    expect(marked.status).toBe(200);
    expect(marked.body.data.notification.readAt).toBeTruthy();

    const otherUser = await register("notif-other");
    const steal = await request(app)
      .post(`/notifications/${approved.id}/read`)
      .set("Authorization", `Bearer ${otherUser.accessToken}`);
    expect(steal.status).toBe(404);

    await request(app)
      .post(`/staff/reports/found/${found.body.data.report.id}/ready-for-handover`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({});

    const afterHandover = await request(app)
      .get("/notifications")
      .set("Authorization", `Bearer ${claimant.accessToken}`);
    expect(
      afterHandover.body.data.notifications.some(
        (n: { type: string }) => n.type === "HANDOVER_READY",
      ),
    ).toBe(true);

    const markAll = await request(app)
      .post("/notifications/read-all")
      .set("Authorization", `Bearer ${claimant.accessToken}`);
    expect(markAll.status).toBe(200);

    const unreadAfter = await request(app)
      .get("/notifications/unread-count")
      .set("Authorization", `Bearer ${claimant.accessToken}`);
    expect(unreadAfter.body.data.unreadCount).toBe(0);
  });
});
