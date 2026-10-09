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
  const email = uniqueEmail("staff-review");
  await prisma.user.create({
    data: {
      email,
      fullName: "Staff Reviewer",
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

describe("staff review and decision", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("restricts staff review endpoints to staff users", async () => {
    const user = await register("non-staff");
    const denied = await request(app)
      .get("/staff/claims")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(denied.status).toBe(403);
  });

  it("lets staff approve a claim, audit the decision, and mark handover ready", async () => {
    const finder = await register("staff-finder");
    const claimant = await register("staff-claimant");
    const competitor = await register("staff-competitor");
    const staffToken = await createStaffToken();
    const marker = `STF-${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
        evidence: "unique patch",
      });
    const claimId = claim.body.data.claim.id as string;

    await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${competitor.accessToken}`)
      .send({
        foundReportId: found.body.data.report.id,
        message: "also mine",
        evidence: "different story",
      });

    const review = await request(app)
      .get(`/staff/claims/${claimId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(review.status).toBe(200);
    expect(review.body.data.verification.privateFoundEvidence.privateDetails).toBe(
      `${marker}-private`,
    );

    const approved = await request(app)
      .post(`/staff/claims/${claimId}/decision`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ decision: "APPROVE", notes: "Evidence consistent with private marking" });
    expect(approved.status).toBe(200);
    expect(approved.body.data.claim.status).toBe("APPROVED");
    expect(approved.body.data.decision).toBe("APPROVE");

    const events = await prisma.caseEvent.findMany({
      where: { claimId, eventType: "CLAIM_APPROVED" },
    });
    expect(events).toHaveLength(1);

    const competing = await prisma.claim.findMany({
      where: {
        foundReportId: found.body.data.report.id,
        id: { not: claimId },
      },
    });
    expect(competing.every((c) => c.status === "REJECTED")).toBe(true);

    const foundAfter = await prisma.itemReport.findUniqueOrThrow({
      where: { id: found.body.data.report.id },
    });
    expect(foundAfter.status).toBe("APPROVED");

    const handover = await request(app)
      .post(`/staff/reports/found/${found.body.data.report.id}/ready-for-handover`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ notes: "Ready at lost & found desk" });
    expect(handover.status).toBe(200);
    expect(handover.body.data.report.status).toBe("HANDOVER_PENDING");

    const handoverEvents = await prisma.caseEvent.findMany({
      where: { reportId: found.body.data.report.id, eventType: "HANDOVER_READY" },
    });
    expect(handoverEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("lets staff reject and request more information with audit events", async () => {
    const finder = await register("staff-finder2");
    const claimant = await register("staff-claimant2");
    const staffToken = await createStaffToken();
    const marker = `DEC-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} phone`,
        description: "internal",
        publicDescription: "Black phone",
        location: "Cafe",
        foundAt: "2026-10-08T12:00:00.000Z",
      });

    const claim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${claimant.accessToken}`)
      .send({
        foundReportId: found.body.data.report.id,
        message: "please",
        evidence: "vague",
      });
    const claimId = claim.body.data.claim.id as string;

    const moreInfo = await request(app)
      .post(`/staff/claims/${claimId}/decision`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ decision: "REQUEST_MORE_INFO", notes: "Need clearer serial description" });
    expect(moreInfo.status).toBe(200);
    expect(moreInfo.body.data.claim.status).toBe("NEEDS_MORE_INFO");

    const rejected = await request(app)
      .post(`/staff/claims/${claimId}/decision`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ decision: "REJECT", notes: "Evidence does not match" });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.claim.status).toBe("REJECTED");

    const eventTypes = (await prisma.caseEvent.findMany({ where: { claimId } })).map(
      (event) => event.eventType,
    );
    expect(eventTypes).toEqual(
      expect.arrayContaining(["CLAIM_MORE_INFO_REQUESTED", "CLAIM_REJECTED"]),
    );
  });

  it("lists reports and matches for staff review", async () => {
    const staffToken = await createStaffToken();

    const reports = await request(app)
      .get("/staff/reports")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(reports.status).toBe(200);
    expect(Array.isArray(reports.body.data.reports)).toBe(true);

    const matches = await request(app)
      .get("/staff/matches")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(matches.status).toBe(200);
    expect(Array.isArray(matches.body.data.matches)).toBe(true);
  });
});
