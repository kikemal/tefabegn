import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
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

describe("matching engine v1", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("generates ranked suggestions without auto-approving ownership", async () => {
    const owner = await register("match-owner");
    const finder = await register("match-finder");
    const marker = `MTCH-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const privateFinder = `${marker}-finder-private`;
    const identifier = `${marker}-SERIAL`;

    const lost = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} Black Dell XPS laptop`,
        description: `${marker} Dell XPS with silver stickers`,
        location: `${marker} Main Library`,
        lostAt: "2026-10-08T09:00:00.000Z",
        identifier,
        privateDetails: `${marker}-owner-private`,
      });

    const strongFound = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} Black Dell XPS laptop`,
        description: `${marker} Recovered Dell XPS`,
        publicDescription: `${marker} Black Dell laptop near library entrance`,
        location: `${marker} Main Library`,
        foundAt: "2026-10-08T13:00:00.000Z",
        identifier,
        privateDetails: privateFinder,
      });

    const weakFound = await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${finder.accessToken}`)
      .send({
        category: "electronics",
        title: `${marker} USB cable`,
        description: "Black cable",
        publicDescription: `${marker} USB cable`,
        location: "Gym locker room",
        foundAt: "2026-09-01T13:00:00.000Z",
      });

    const generated = await request(app)
      .post("/matches/generate")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ lostReportId: lost.body.data.report.id, limit: 20 });

    expect(generated.status).toBe(200);
    expect(generated.body.data.suggestionOnly).toBe(true);
    expect(generated.body.data.matches.length).toBeGreaterThanOrEqual(1);

    const createdFoundIds = new Set([
      strongFound.body.data.report.id as string,
      weakFound.body.data.report.id as string,
    ]);
    const rankedCreated = generated.body.data.matches.filter(
      (match: { foundReport: { id: string } }) => createdFoundIds.has(match.foundReport.id),
    );

    expect(rankedCreated.length).toBeGreaterThanOrEqual(1);
    expect(rankedCreated[0].foundReport.id).toBe(strongFound.body.data.report.id);
    expect(
      rankedCreated.map((match: { foundReport: { id: string } }) => match.foundReport.id),
    ).not.toContain(weakFound.body.data.report.id);

    const top = rankedCreated[0];
    expect(top.status).toBe("SUGGESTED");
    expect(top.suggestionOnly).toBe(true);
    expect(top.lostReport.id).toBe(lost.body.data.report.id);
    expect(top.score).toBeGreaterThan(0);
    expect(top.reasons.signals.length).toBeGreaterThan(0);

    // Owner viewing match should not see the other party's private details.
    expect(top.foundReport.privateDetails).toBeUndefined();
    expect(JSON.stringify(top)).not.toContain(privateFinder);
    expect(JSON.stringify(top.reasons)).not.toContain(identifier);
  });

  it("forbids unrelated users from generating or viewing matches", async () => {
    const owner = await register("match-owner2");
    const stranger = await register("match-stranger");

    const lost = await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        category: "bags",
        title: "Green tote bag",
        description: "Canvas tote",
        location: "Cafeteria",
        lostAt: "2026-10-07T09:00:00.000Z",
      });

    const deniedGenerate = await request(app)
      .post("/matches/generate")
      .set("Authorization", `Bearer ${stranger.accessToken}`)
      .send({ lostReportId: lost.body.data.report.id });
    expect(deniedGenerate.status).toBe(403);

    await request(app)
      .post("/matches/generate")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ lostReportId: lost.body.data.report.id });

    const listed = await request(app)
      .get("/matches")
      .query({ lostReportId: lost.body.data.report.id })
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(listed.status).toBe(200);

    if (listed.body.data.matches[0]) {
      const deniedView = await request(app)
        .get(`/matches/${listed.body.data.matches[0].id}`)
        .set("Authorization", `Bearer ${stranger.accessToken}`);
      expect(deniedView.status).toBe(403);
    }
  });
});
