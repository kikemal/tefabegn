import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { disconnectDatabase, prisma } from "../src/db/prisma";
import { createStaffToken } from "./helpers";

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

describe("claims", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("creates a claim without exposing found private evidence to the claimant", async () => {
    const finder = await register("claim-finder");
    const claimant = await register("claimant");
    const marker = `CLM-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const hidden = `${marker}-hidden-answer`;

    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "bags",
        title: `${marker} found bag`,
        description: `Internal ${hidden}`,
        publicDescription: "Blue bag near cafeteria",
        location: "Cafeteria",
        foundAt: "2026-10-08T12:00:00.000Z",
        identifier: `${marker}-ID`,
        privateDetails: hidden,
        imageRef: `private/${marker}.jpg`,
      });

    const created = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${claimant.accessToken}`)
      .send({
        foundReportId: found.body.data.report.id,
        message: "This is my bag",
        evidence: "I can describe the inner patch and contents",
        proofRef: "uploads/claim-proof-1.jpg",
      });

    expect(created.status).toBe(201);
    expect(created.body.data.claim.status).toBe("SUBMITTED");
    expect(created.body.data.claim.claimantId).toBe(claimant.userId);
    expect(created.body.data.claim.evidence).toContain("inner patch");
    expect(created.body.data.claim.foundReport.publicDescription).toBe("Blue bag near cafeteria");
    expect(created.body.data.claim.foundReport.privateDetails).toBeUndefined();
    expect(created.body.data.claim.foundReport.identifier).toBeUndefined();
    expect(created.body.data.claim.foundReport.imageRef).toBeUndefined();
    expect(created.body.data.claim.foundReport.description).toBeUndefined();

    const body = JSON.stringify(created.body);
    expect(body).not.toContain(hidden);
    expect(body).not.toContain(`${marker}-ID`);
    expect(body).not.toContain(`private/${marker}.jpg`);

    const storedFound = await prisma.itemReport.findUniqueOrThrow({
      where: { id: found.body.data.report.id },
    });
    expect(storedFound.status).toBe("CLAIM_PENDING");
  });

  it("handles duplicate claims and blocks finder self-claims", async () => {
    const finder = await register("dup-finder");
    const claimant = await register("dup-claimant");
    const marker = `DUP-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} phone`,
        description: "phone",
        publicDescription: "Black phone",
        location: "Library",
        foundAt: "2026-10-08T12:00:00.000Z",
      });

    const selfClaim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        foundReportId: found.body.data.report.id,
        message: "mine",
        evidence: "because",
      });
    expect(selfClaim.status).toBe(403);

    const first = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${claimant.accessToken}`)
      .send({
        foundReportId: found.body.data.report.id,
        message: "first claim",
        evidence: "evidence one",
      });
    expect(first.status).toBe(201);
    expect(first.body.data.conflictingActiveClaims).toBe(0);

    const duplicate = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${claimant.accessToken}`)
      .send({
        foundReportId: found.body.data.report.id,
        message: "second claim",
        evidence: "evidence two",
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_CLAIM");

    const other = await register("other-claimant");
    const conflict = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${other.accessToken}`)
      .send({
        foundReportId: found.body.data.report.id,
        message: "competing claim",
        evidence: "other evidence",
      });
    expect(conflict.status).toBe(201);
    expect(conflict.body.data.conflictingActiveClaims).toBe(1);
  });

  it("supports match-based claims and controlled withdraw", async () => {
    const owner = await register("match-claim-owner");
    const finder = await register("match-claim-finder");
    const stranger = await register("match-claim-stranger");
    const marker = `MCL-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const lost = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} lost laptop`,
        description: `${marker} dell laptop`,
        location: `${marker} Library`,
        lostAt: "2026-10-08T09:00:00.000Z",
        identifier: `${marker}-SN`,
      });

    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} found laptop`,
        description: `${marker} recovered laptop`,
        publicDescription: `${marker} black laptop`,
        location: `${marker} Library`,
        foundAt: "2026-10-08T12:00:00.000Z",
        identifier: `${marker}-SN`,
      });

    const generated = await request(app)
      .post("/matches/generate")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ lostReportId: lost.body.data.report.id });
    expect(generated.status).toBe(200);
    const matchId = generated.body.data.matches[0]?.id as string;
    expect(matchId).toBeTruthy();

    const strangerClaim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${stranger.accessToken}`)
      .send({
        matchId,
        message: "not my match",
        evidence: "guessing",
      });
    expect(strangerClaim.status).toBe(403);

    const claim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        matchId,
        message: "This matches my lost report",
        evidence: "serial and stickers match",
      });
    expect(claim.status).toBe(201);
    expect(claim.body.data.claim.matchId).toBe(matchId);
    expect(claim.body.data.claim.foundReportId).toBe(found.body.data.report.id);

    const mine = await request(app)
      .get("/claims/mine")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(mine.status).toBe(200);
    expect(
      mine.body.data.claims.some((c: { id: string }) => c.id === claim.body.data.claim.id),
    ).toBe(true);

    const denied = await request(app)
      .get(`/claims/${claim.body.data.claim.id}`)
      .set("Authorization", `Bearer ${stranger.accessToken}`);
    expect(denied.status).toBe(403);

    const withdrawn = await request(app)
      .post(`/claims/${claim.body.data.claim.id}/withdraw`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.data.claim.status).toBe("WITHDRAWN");
  });

  it("redacts claimant private fields for the finder while claimant and staff retain them", async () => {
    const finder = await register("priv-finder");
    const claimant = await register("priv-claimant");
    const stranger = await register("priv-stranger");
    const staffToken = await createStaffToken(app, "priv-staff");
    const marker = `PRV-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const secretMessage = `${marker}-CLAIM-MESSAGE-SECRET`;
    const secretEvidence = `${marker}-CLAIM-EVIDENCE-SECRET`;
    const secretProof = `${marker}-CLAIM-PROOF-SECRET`;

    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "bags",
        title: `${marker} bag`,
        description: "internal",
        publicDescription: "Blue bag",
        location: "Lobby",
        foundAt: "2026-10-08T12:00:00.000Z",
      });

    const created = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${claimant.accessToken}`)
      .send({
        foundReportId: found.body.data.report.id,
        message: secretMessage,
        evidence: secretEvidence,
        proofRef: secretProof,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.claim.message).toBe(secretMessage);
    expect(created.body.data.claim.evidence).toBe(secretEvidence);
    expect(created.body.data.claim.proofRef).toBe(secretProof);

    const claimId = created.body.data.claim.id as string;

    const asClaimant = await request(app)
      .get(`/claims/${claimId}`)
      .set("Authorization", `Bearer ${claimant.accessToken}`);
    expect(asClaimant.status).toBe(200);
    expect(asClaimant.body.data.claim.message).toBe(secretMessage);
    expect(asClaimant.body.data.claim.evidence).toBe(secretEvidence);
    expect(asClaimant.body.data.claim.proofRef).toBe(secretProof);

    const asFinder = await request(app)
      .get(`/claims/${claimId}`)
      .set("Authorization", `Bearer ${finder.accessToken}`);
    expect(asFinder.status).toBe(200);
    expect(asFinder.body.data.claim.status).toBe("SUBMITTED");
    expect(asFinder.body.data.claim.id).toBe(claimId);
    expect(asFinder.body.data.claim.foundReportId).toBe(found.body.data.report.id);
    expect(asFinder.body.data.claim.message).toBeNull();
    expect(asFinder.body.data.claim.evidence).toBeNull();
    expect(asFinder.body.data.claim.proofRef).toBeNull();
    const finderBody = JSON.stringify(asFinder.body);
    expect(finderBody).not.toContain(secretMessage);
    expect(finderBody).not.toContain(secretEvidence);
    expect(finderBody).not.toContain(secretProof);

    const asStaff = await request(app)
      .get(`/claims/${claimId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(asStaff.status).toBe(200);
    expect(asStaff.body.data.claim.evidence).toBe(secretEvidence);
    expect(asStaff.body.data.claim.message).toBe(secretMessage);
    expect(asStaff.body.data.claim.proofRef).toBe(secretProof);

    const staffReview = await request(app)
      .get(`/staff/claims/${claimId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(staffReview.status).toBe(200);
    expect(staffReview.body.data.claim.evidence).toBe(secretEvidence);
    expect(staffReview.body.data.verification.claimantEvidence.evidence).toBe(secretEvidence);

    const asStranger = await request(app)
      .get(`/claims/${claimId}`)
      .set("Authorization", `Bearer ${stranger.accessToken}`);
    expect(asStranger.status).toBe(403);
  });
});
