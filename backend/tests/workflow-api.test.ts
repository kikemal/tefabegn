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
  const email = uniqueEmail("workflow-staff");
  await prisma.user.create({
    data: {
      email,
      fullName: "Workflow Staff",
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

describe("case status workflow API", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("returns human-readable status labels and advances ACTIVE → POSSIBLE_MATCH on match", async () => {
    const owner = await register("wf-owner");
    const finder = await register("wf-finder");
    const marker = `WF-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const lost = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} phone`,
        description: "black phone",
        location: "Library",
        lostAt: "2026-10-08T10:00:00.000Z",
      });
    expect(lost.status).toBe(201);
    expect(lost.body.data.report.status).toBe("ACTIVE");
    expect(lost.body.data.report.statusLabel).toBe("Active");

    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} phone`,
        description: "internal",
        publicDescription: "black phone",
        location: "Library",
        foundAt: "2026-10-08T11:00:00.000Z",
      });
    expect(found.status).toBe(201);

    const matches = await request(app)
      .post("/matches/generate")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ lostReportId: lost.body.data.report.id, limit: 20 });
    expect(matches.status).toBe(200);

    const pair = matches.body.data.matches.find(
      (match: { foundReport: { id: string } }) =>
        match.foundReport.id === found.body.data.report.id,
    );
    expect(pair).toBeDefined();
    expect(pair.statusLabel).toBe("Suggested");
    expect(pair.lostReport.status).toBe("POSSIBLE_MATCH");
    expect(pair.lostReport.statusLabel).toBe("Possible match");
    expect(pair.foundReport.status).toBe("POSSIBLE_MATCH");
  });

  it("rejects invalid status transitions", async () => {
    const finder = await register("wf-invalid-finder");
    const claimant = await register("wf-invalid-claimant");
    const staffToken = await createStaffToken();
    const marker = `WFI-${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
        privateDetails: "hidden tag",
      });
    expect(found.status).toBe(201);
    const foundId = found.body.data.report.id as string;

    const handoverTooEarly = await request(app)
      .post(`/staff/reports/found/${foundId}/ready-for-handover`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({});
    expect(handoverTooEarly.status).toBe(409);
    expect(handoverTooEarly.body.error.code).toBe("INVALID_STATUS");

    const claim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${claimant.accessToken}`)
      .send({
        foundReportId: foundId,
        message: "mine",
        evidence: "tag details",
      });
    expect(claim.status).toBe(201);
    expect(claim.body.data.claim.statusLabel).toBe("Submitted");

    const approve = await request(app)
      .post(`/staff/claims/${claim.body.data.claim.id}/decision`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ decision: "APPROVE", notes: "Evidence matches private marking" });
    expect(approve.status).toBe(200);
    expect(approve.body.data.claim.status).toBe("APPROVED");

    const withdrawApproved = await request(app)
      .post(`/claims/${claim.body.data.claim.id}/withdraw`)
      .set("Authorization", `Bearer ${claimant.accessToken}`);
    expect(withdrawApproved.status).toBe(409);
    expect(withdrawApproved.body.error.code).toBe("INVALID_STATUS");

    const cancelApprovedFound = await request(app)
      .post(`/reports/found/${foundId}/cancel`)
      .set("Authorization", `Bearer ${finder.accessToken}`);
    expect(cancelApprovedFound.status).toBe(409);
    expect(cancelApprovedFound.body.error.code).toBe("INVALID_STATUS");

    const claimAgain = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${claimant.accessToken}`)
      .send({
        foundReportId: foundId,
        message: "again",
        evidence: "tag",
      });
    expect(claimAgain.status).toBe(409);
    expect(claimAgain.body.error.code).toBe("INVALID_STATUS");
  });
});
