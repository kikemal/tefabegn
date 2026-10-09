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

async function createStaff() {
  const email = uniqueEmail("staff-verify");
  await prisma.user.create({
    data: {
      email,
      fullName: "Staff Verifier",
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

describe("ownership verification", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("requires staff authorization and keeps public/private evidence separated", async () => {
    const finder = await register("verify-finder");
    const claimant = await register("verify-claimant");
    const staffToken = await createStaff();
    const marker = `VFY-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const hidden = `${marker}-secret-marking`;

    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "bags",
        title: `${marker} backpack`,
        description: `Internal detail ${hidden}`,
        publicDescription: "Black backpack at Main Library",
        location: "Main Library",
        foundAt: "2026-10-08T12:00:00.000Z",
        identifier: `${marker}-TAG`,
        privateDetails: hidden,
        imageRef: `private/${marker}.jpg`,
      });

    const claim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${claimant.accessToken}`)
      .send({
        foundReportId: found.body.data.report.id,
        message: "This is mine",
        evidence: "I remember the unique sticker inside",
      });
    expect(claim.status).toBe(201);
    const claimId = claim.body.data.claim.id as string;

    const denied = await request(app)
      .get(`/verification/claims/${claimId}`)
      .set("Authorization", `Bearer ${claimant.accessToken}`);
    expect(denied.status).toBe(403);

    const packageResponse = await request(app)
      .get(`/verification/claims/${claimId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(packageResponse.status).toBe(200);

    const verification = packageResponse.body.data.verification;
    expect(verification.autoApproval).toBe(false);
    expect(verification.publicFound.publicDescription).toBe("Black backpack at Main Library");
    expect(verification.publicFound.privateDetails).toBeUndefined();
    expect(verification.privateFoundEvidence.privateDetails).toBe(hidden);
    expect(verification.privateFoundEvidence.identifier).toBe(`${marker}-TAG`);
    expect(verification.privateFoundEvidence.imageRef).toBe(`private/${marker}.jpg`);
    expect(verification.claimantEvidence.evidence).toContain("unique sticker");
  });

  it("records auditable verification attempts without auto-approving", async () => {
    const finder = await register("verify-finder2");
    const claimant = await register("verify-claimant2");
    const staffToken = await createStaff();
    const marker = `ATT-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} headphones`,
        description: "internal",
        publicDescription: "Black headphones",
        location: "Gym",
        foundAt: "2026-10-08T12:00:00.000Z",
        privateDetails: `${marker}-private`,
      });

    const claim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${claimant.accessToken}`)
      .send({
        foundReportId: found.body.data.report.id,
        message: "mine",
        evidence: "serial on the cup",
      });
    const claimId = claim.body.data.claim.id as string;

    const attempt = await request(app)
      .post(`/verification/claims/${claimId}/attempts`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        assessment: "CONSISTENT",
        notes: "Claimant description aligns with private marking",
      });

    expect(attempt.status).toBe(200);
    expect(attempt.body.data.attempt.autoApproved).toBe(false);
    expect(attempt.body.data.attempt.resultingStatus).toBe("UNDER_REVIEW");
    expect(attempt.body.data.verification.claimStatus).toBe("UNDER_REVIEW");
    expect(attempt.body.data.verification.claimStatus).not.toBe("APPROVED");

    const events = await prisma.caseEvent.findMany({
      where: { claimId, eventType: "VERIFICATION_RECORDED" },
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(events[0]?.metadata)).toContain("CONSISTENT");
    expect(JSON.stringify(events[0]?.metadata)).toContain('"autoApproved":false');

    const moreInfo = await request(app)
      .post(`/verification/claims/${claimId}/attempts`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        assessment: "UNCLEAR",
        notes: "Need photo of the serial",
        requestMoreInfo: true,
      });
    expect(moreInfo.status).toBe(200);
    expect(moreInfo.body.data.attempt.resultingStatus).toBe("NEEDS_MORE_INFO");
    expect(moreInfo.body.data.verification.claimStatus).toBe("NEEDS_MORE_INFO");
  });

  it("lists verifiable claims for staff only", async () => {
    const staffToken = await createStaff();
    const user = await register("verify-list-user");

    const denied = await request(app)
      .get("/verification/claims")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(denied.status).toBe(403);

    const list = await request(app)
      .get("/verification/claims")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.autoApproval).toBe(false);
    expect(Array.isArray(list.body.data.claims)).toBe(true);
  });
});
