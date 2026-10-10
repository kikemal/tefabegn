import { AccountStatus, Role } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { recordCaseEvent } from "../src/audit/service";
import { sanitizeAuditMetadata } from "../src/audit/sanitize";
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
  const email = uniqueEmail("audit-staff");
  await prisma.user.create({
    data: {
      email,
      fullName: "Audit Staff",
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

describe("audit metadata sanitization", () => {
  it("strips private keys from nested metadata", () => {
    const cleaned = sanitizeAuditMetadata({
      notes: "safe",
      privateDetails: "secret",
      evidence: "secret-evidence",
      nested: {
        identifier: "IMEI",
        publicDescription: "Blue bag",
      },
    }) as Record<string, unknown>;

    expect(cleaned.notes).toBe("safe");
    expect(cleaned.privateDetails).toBeUndefined();
    expect(cleaned.evidence).toBeUndefined();
    expect((cleaned.nested as Record<string, unknown>).identifier).toBeUndefined();
    expect((cleaned.nested as Record<string, unknown>).publicDescription).toBe("Blue bag");
  });
});

describe("audit log / chain of custody", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("lets staff reconstruct chronological case history and blocks ordinary users", async () => {
    const finder = await register("audit-finder");
    const claimant = await register("audit-claimant");
    const staffToken = await createStaffToken();
    const marker = `AUD-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const secret = `${marker}-PRIVATE`;

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
      });
    expect(found.status).toBe(201);
    const foundId = found.body.data.report.id as string;

    const claim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${claimant.accessToken}`)
      .send({
        foundReportId: foundId,
        message: "mine",
        evidence: secret,
      });
    expect(claim.status).toBe(201);
    const claimId = claim.body.data.claim.id as string;

    const approve = await request(app)
      .post(`/staff/claims/${claimId}/decision`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ decision: "APPROVE", notes: "ok" });
    expect(approve.status).toBe(200);

    const denied = await request(app)
      .get(`/staff/audit/reports/${foundId}`)
      .set("Authorization", `Bearer ${claimant.accessToken}`);
    expect(denied.status).toBe(403);

    const reportHistory = await request(app)
      .get(`/staff/audit/reports/${foundId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(reportHistory.status).toBe(200);

    const eventTypes = reportHistory.body.data.events.map(
      (e: { eventType: string }) => e.eventType,
    );
    expect(eventTypes).toEqual(
      expect.arrayContaining(["FOUND_REPORTED", "CLAIM_SUBMITTED", "CLAIM_APPROVED"]),
    );

    // Chronological order
    const createdAts = reportHistory.body.data.events.map((e: { createdAt: string }) =>
      new Date(e.createdAt).getTime(),
    );
    expect([...createdAts].sort((a, b) => a - b)).toEqual(createdAts);

    const first = reportHistory.body.data.events[0];
    expect(first.eventLabel).toBeTruthy();
    expect(first.actor).toBeTruthy();
    expect(JSON.stringify(reportHistory.body.data.events)).not.toContain(secret);

    const claimHistory = await request(app)
      .get(`/staff/audit/claims/${claimId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(claimHistory.status).toBe(200);
    expect(claimHistory.body.data.events.length).toBeGreaterThanOrEqual(2);

    // Append-only: no staff update/delete audit endpoints
    const updateAttempt = await request(app)
      .patch(`/staff/audit/reports/${foundId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ eventType: "TAMPERED" });
    expect(updateAttempt.status).toBe(404);

    const deleteAttempt = await request(app)
      .delete(`/staff/audit/claims/${claimId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(deleteAttempt.status).toBe(404);

    // Shared writer strips private metadata on create
    await recordCaseEvent({
      reportId: foundId,
      actorId: finder.userId,
      eventType: "TEST_SANITIZE",
      metadata: {
        notes: "visible",
        privateDetails: secret,
        evidence: secret,
      },
    });
    const stored = await prisma.caseEvent.findFirst({
      where: { reportId: foundId, eventType: "TEST_SANITIZE" },
    });
    expect(stored).toBeTruthy();
    expect(stored!.metadata).toMatchObject({ notes: "visible" });
    expect(JSON.stringify(stored!.metadata)).not.toContain(secret);
  });
});
