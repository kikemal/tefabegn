import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { disconnectDatabase, prisma } from "../src/db/prisma";
import { createStaffToken, registerUser, uniqueMarker } from "./helpers";

const app = createApp();

/**
 * End-to-end business lifecycle covering TASK-018 priorities:
 * report → match → claim → verify → approve → handover → return → close
 * plus notifications, audit trail, and private-evidence protection.
 */
describe("full case lifecycle (integration)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("runs the lost/found case to closure without leaking private evidence", async () => {
    const owner = await registerUser(app, "life-owner");
    const finder = await registerUser(app, "life-finder");
    const staffToken = await createStaffToken(app, "life-staff");
    const marker = uniqueMarker("LIFE");
    const lostSecret = `${marker}-LOST-PRIVATE`;
    const foundSecret = `${marker}-FOUND-PRIVATE`;

    const lost = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} Black phone`,
        description: "Campus phone case",
        location: `${marker} Library`,
        lostAt: "2026-10-08T10:00:00.000Z",
        privateDetails: lostSecret,
        identifier: `${marker}-IMEI`,
      });
    expect(lost.status).toBe(201);
    expect(lost.body.data.report.status).toBe("ACTIVE");
    const lostId = lost.body.data.report.id as string;

    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} Black phone`,
        description: `Internal ${foundSecret}`,
        publicDescription: `${marker} black phone near library`,
        location: `${marker} Library`,
        foundAt: "2026-10-08T11:30:00.000Z",
        privateDetails: foundSecret,
        identifier: `${marker}-IMEI`,
      });
    expect(found.status).toBe(201);
    const foundId = found.body.data.report.id as string;

    // Search must stay public-safe
    const search = await request(app)
      .get("/reports/search")
      .query({ q: marker, type: "FOUND" })
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(search.status).toBe(200);
    expect(JSON.stringify(search.body.data)).not.toContain(foundSecret);
    expect(JSON.stringify(search.body.data)).not.toContain("privateDetails");

    const generated = await request(app)
      .post("/matches/generate")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ lostReportId: lostId, limit: 20 });
    expect(generated.status).toBe(200);
    expect(generated.body.data.suggestionOnly).toBe(true);
    const match = generated.body.data.matches.find(
      (m: { foundReport: { id: string } }) => m.foundReport.id === foundId,
    );
    expect(match).toBeDefined();
    expect(match.suggestionOnly).toBe(true);
    // Owner may see own lost private fields; found private evidence must stay hidden.
    expect(match.lostReport.privateDetails).toBe(lostSecret);
    expect(match.foundReport.privateDetails).toBeUndefined();
    expect(JSON.stringify(match.foundReport)).not.toContain(foundSecret);
    expect(JSON.stringify(match.reasons)).not.toContain(foundSecret);

    const claim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        matchId: match.id,
        foundReportId: foundId,
        message: "This is my phone",
        evidence: "I recognize my sticker and IMEI",
      });
    expect(claim.status).toBe(201);
    expect(claim.body.data.claim.status).toBe("SUBMITTED");
    expect(claim.body.data.claim.foundReport.privateDetails).toBeUndefined();
    expect(JSON.stringify(claim.body.data.claim)).not.toContain(foundSecret);
    const claimId = claim.body.data.claim.id as string;

    // Invalid transition: cannot mark returned before approval/handover
    const earlyReturn = await request(app)
      .post(`/staff/reports/found/${foundId}/confirm-return`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({});
    expect(earlyReturn.status).toBe(409);
    expect(earlyReturn.body.error.code).toBe("INVALID_STATUS");

    const verification = await request(app)
      .post(`/verification/claims/${claimId}/attempts`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        assessment: "CONSISTENT",
        notes: "Evidence matches private marking",
        requestMoreInfo: false,
      });
    expect(verification.status).toBe(200);
    expect(verification.body.data.attempt.autoApproved).toBe(false);
    expect(verification.body.data.attempt.resultingStatus).toBe("UNDER_REVIEW");
    expect(verification.body.data.verification.privateFoundEvidence.privateDetails).toBe(
      foundSecret,
    );

    const approve = await request(app)
      .post(`/staff/claims/${claimId}/decision`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ decision: "APPROVE", notes: "Ownership verified" });
    expect(approve.status).toBe(200);
    expect(approve.body.data.claim.status).toBe("APPROVED");

    const ready = await request(app)
      .post(`/staff/reports/found/${foundId}/ready-for-handover`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ notes: "Desk window 2–4pm" });
    expect(ready.status).toBe(200);
    expect(ready.body.data.report.status).toBe("HANDOVER_PENDING");

    const receipt = await request(app)
      .post(`/claims/${claimId}/confirm-receipt`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ notes: "Received at desk" });
    expect(receipt.status).toBe(200);
    expect(receipt.body.data.claim.recipientConfirmedAt).toBeTruthy();

    // Ordinary user cannot mark returned
    const userReturn = await request(app)
      .post(`/staff/reports/found/${foundId}/confirm-return`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({});
    expect(userReturn.status).toBe(403);

    const returned = await request(app)
      .post(`/staff/reports/found/${foundId}/confirm-return`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ returnedAt: "2026-10-09T16:00:00.000Z" });
    expect(returned.status).toBe(200);
    expect(returned.body.data.report.status).toBe("RETURNED");
    expect(returned.body.data.report.returnedAt).toBe("2026-10-09T16:00:00.000Z");

    const closed = await request(app)
      .post(`/staff/reports/found/${foundId}/close-case`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ notes: "Closed after return" });
    expect(closed.status).toBe(200);
    expect(closed.body.data.report.status).toBe("CLOSED");
    expect(closed.body.data.claim.status).toBe("CLOSED");

    // Notifications for owner (claimant) — privacy safe
    const notes = await request(app)
      .get("/notifications")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(notes.status).toBe(200);
    const types = notes.body.data.notifications.map((n: { type: string }) => n.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "POSSIBLE_MATCH",
        "CLAIM_APPROVED",
        "HANDOVER_READY",
        "ITEM_RETURNED",
        "CASE_CLOSED",
      ]),
    );
    expect(JSON.stringify(notes.body.data.notifications)).not.toContain(foundSecret);
    expect(JSON.stringify(notes.body.data.notifications)).not.toContain(lostSecret);

    // Audit trail reconstructs the case
    const audit = await request(app)
      .get(`/staff/audit/reports/${foundId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(audit.status).toBe(200);
    const eventTypes = audit.body.data.events.map((e: { eventType: string }) => e.eventType);
    expect(eventTypes).toEqual(
      expect.arrayContaining([
        "FOUND_REPORTED",
        "MATCH_SUGGESTED",
        "CLAIM_SUBMITTED",
        "VERIFICATION_RECORDED",
        "CLAIM_APPROVED",
        "HANDOVER_READY",
        "HANDOVER_COMPLETED",
        "CASE_CLOSED",
      ]),
    );
    expect(JSON.stringify(audit.body.data.events)).not.toContain(foundSecret);

    const createdAts = audit.body.data.events.map((e: { createdAt: string }) =>
      new Date(e.createdAt).getTime(),
    );
    expect([...createdAts].sort((a, b) => a - b)).toEqual(createdAts);
  }, 60_000);
});
