import { MatchStatus, ReportStatus } from "@prisma/client";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db/prisma";
import { createStaffToken, registerUser, uniqueMarker } from "./helpers";

const app = createApp();

describe("TASK-019 integration review fixes", () => {
  let staffToken: string;

  beforeAll(async () => {
    staffToken = await createStaffToken(app, "int-review-staff");
  });

  it("does not rewind non-SUGGESTED match status on regenerate", async () => {
    const owner = await registerUser(app, "int-match-owner");
    const finder = await registerUser(app, "int-match-finder");
    const marker = uniqueMarker("INT-MATCH");

    const lost = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} lost phone`,
        description: `${marker} black phone`,
        location: `${marker} Library`,
        lostAt: "2026-10-08T09:00:00.000Z",
        identifier: `${marker}-IMEI`,
      });
    expect(lost.status).toBe(201);

    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} found phone`,
        description: `${marker} recovered phone`,
        publicDescription: `${marker} black phone`,
        location: `${marker} Library`,
        foundAt: "2026-10-08T12:00:00.000Z",
        identifier: `${marker}-IMEI`,
      });
    expect(found.status).toBe(201);

    const generated = await request(app)
      .post("/matches/generate")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ lostReportId: lost.body.data.report.id });
    expect(generated.status).toBe(200);
    const matchId = generated.body.data.matches[0]?.id as string;
    expect(matchId).toBeTruthy();

    await prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.ACCEPTED_FOR_REVIEW },
    });

    const regenerated = await request(app)
      .post("/matches/generate")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ lostReportId: lost.body.data.report.id });
    expect(regenerated.status).toBe(200);

    const match = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
    expect(match.status).toBe(MatchStatus.ACCEPTED_FOR_REVIEW);
  });

  it("reverts report status when the last active claim is withdrawn", async () => {
    const owner = await registerUser(app, "int-withdraw-owner");
    const finder = await registerUser(app, "int-withdraw-finder");
    const marker = uniqueMarker("INT-WD");

    const lost = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        category: "bags",
        title: `${marker} lost bag`,
        description: `${marker} blue bag`,
        location: `${marker} Cafeteria`,
        lostAt: "2026-10-08T09:00:00.000Z",
      });
    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "bags",
        title: `${marker} found bag`,
        description: `${marker} recovered bag`,
        publicDescription: `${marker} blue bag`,
        location: `${marker} Cafeteria`,
        foundAt: "2026-10-08T12:00:00.000Z",
      });

    const generated = await request(app)
      .post("/matches/generate")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ lostReportId: lost.body.data.report.id });
    expect(generated.status).toBe(200);
    const matchId = generated.body.data.matches[0]?.id as string;

    const claim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        matchId,
        message: "mine",
        evidence: "blue zipper pull",
      });
    expect(claim.status).toBe(201);

    const foundPending = await prisma.itemReport.findUniqueOrThrow({
      where: { id: found.body.data.report.id },
    });
    expect(foundPending.status).toBe(ReportStatus.CLAIM_PENDING);

    const withdrawn = await request(app)
      .post(`/claims/${claim.body.data.claim.id}/withdraw`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(withdrawn.status).toBe(200);

    const foundAfter = await prisma.itemReport.findUniqueOrThrow({
      where: { id: found.body.data.report.id },
    });
    const lostAfter = await prisma.itemReport.findUniqueOrThrow({
      where: { id: lost.body.data.report.id },
    });
    expect([ReportStatus.ACTIVE, ReportStatus.POSSIBLE_MATCH]).toContain(foundAfter.status);
    expect([ReportStatus.ACTIVE, ReportStatus.POSSIBLE_MATCH]).toContain(lostAfter.status);
    expect(foundAfter.status).not.toBe(ReportStatus.CLAIM_PENDING);
    expect(lostAfter.status).not.toBe(ReportStatus.CLAIM_PENDING);
  });

  it("advances linked lost report to HANDOVER_PENDING when marking handover ready", async () => {
    const owner = await registerUser(app, "int-hand-owner");
    const finder = await registerUser(app, "int-hand-finder");
    const marker = uniqueMarker("INT-HO");

    const lost = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        category: "keys",
        title: `${marker} lost keys`,
        description: `${marker} keyring`,
        location: `${marker} Gym`,
        lostAt: "2026-10-08T09:00:00.000Z",
      });
    const found = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "keys",
        title: `${marker} found keys`,
        description: `${marker} recovered keys`,
        publicDescription: `${marker} keyring`,
        location: `${marker} Gym`,
        foundAt: "2026-10-08T12:00:00.000Z",
        privateDetails: `${marker} red fob`,
      });

    const generated = await request(app)
      .post("/matches/generate")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ lostReportId: lost.body.data.report.id });
    const matchId = generated.body.data.matches[0]?.id as string;

    const claim = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        matchId,
        message: "mine",
        evidence: `${marker} red fob`,
      });
    expect(claim.status).toBe(201);

    const approved = await request(app)
      .post(`/staff/claims/${claim.body.data.claim.id}/decision`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ decision: "APPROVE", notes: "ok" });
    expect(approved.status).toBe(200);

    const handover = await request(app)
      .post(`/staff/reports/found/${found.body.data.report.id}/ready-for-handover`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ notes: "desk A" });
    expect(handover.status).toBe(200);

    const lostAfter = await prisma.itemReport.findUniqueOrThrow({
      where: { id: lost.body.data.report.id },
    });
    expect(lostAfter.status).toBe(ReportStatus.HANDOVER_PENDING);
  });

  it("returns ACCOUNT_DISABLED for authenticated disabled users", async () => {
    const user = await registerUser(app, "int-disabled");
    await prisma.user.update({
      where: { id: user.userId },
      data: { status: "DISABLED" },
    });

    const me = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(me.status).toBe(403);
    expect(me.body.error.code).toBe("ACCOUNT_DISABLED");
  });
});
