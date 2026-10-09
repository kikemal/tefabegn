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
  };
}

describe("report search", () => {
  let token = "";
  let secretMarker = "";

  beforeAll(async () => {
    await prisma.$connect();
    const user = await register("search");
    token = user.accessToken;
    secretMarker = `SECRET-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category: "electronics",
        title: "Searchable lost laptop",
        description: "Lost near engineering building",
        location: "Engineering Building",
        lostAt: "2026-10-01T10:00:00.000Z",
        identifier: "IMEI-SHOULD-NOT-APPEAR",
        privateDetails: `${secretMarker}-lost-private`,
      });

    await request(app)
      .post("/reports/found")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category: "bags",
        title: "Searchable found backpack",
        description: `Internal found notes ${secretMarker}-found-desc`,
        publicDescription: "Blue backpack near cafeteria",
        location: "Student Cafeteria",
        foundAt: "2026-10-05T14:00:00.000Z",
        identifier: "TAG-SHOULD-NOT-APPEAR",
        privateDetails: `${secretMarker}-found-private`,
        imageRef: "private/found/should-not-appear.jpg",
      });

    await request(app)
      .post("/reports/lost")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category: "keys",
        title: "Cancelled keys",
        description: "Should not appear in default search",
        location: "Dorm A",
        lostAt: "2026-09-01T10:00:00.000Z",
      })
      .then(async (created) => {
        await request(app)
          .post(`/reports/lost/${created.body.data.report.id}/cancel`)
          .set("Authorization", `Bearer ${token}`);
      });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/reports/search");
    expect(response.status).toBe(401);
  });

  it("returns paginated public-safe results with deterministic ordering", async () => {
    const response = await request(app)
      .get("/reports/search")
      .query({ page: 1, pageSize: 1, q: "Searchable" })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });

    const page2 = await request(app)
      .get("/reports/search")
      .query({ page: 2, pageSize: 1, q: "Searchable" })
      .set("Authorization", `Bearer ${token}`);

    expect(page2.status).toBe(200);
    expect(page2.body.data.items).toHaveLength(1);
    expect(page2.body.data.items[0].id).not.toBe(response.body.data.items[0].id);

    const ids = [response.body.data.items[0].id, page2.body.data.items[0].id];
    const again = await request(app)
      .get("/reports/search")
      .query({ page: 1, pageSize: 2, q: "Searchable" })
      .set("Authorization", `Bearer ${token}`);
    expect(again.body.data.items.map((item: { id: string }) => item.id)).toEqual(ids);
  });

  it("filters by type, category, location, and date range", async () => {
    const byType = await request(app)
      .get("/reports/search")
      .query({ type: "FOUND", q: "Searchable" })
      .set("Authorization", `Bearer ${token}`);
    expect(byType.status).toBe(200);
    expect(byType.body.data.items.every((item: { type: string }) => item.type === "FOUND")).toBe(
      true,
    );

    const byCategory = await request(app)
      .get("/reports/search")
      .query({ category: "electronics", q: "Searchable" })
      .set("Authorization", `Bearer ${token}`);
    expect(
      byCategory.body.data.items.every(
        (item: { category: string }) => item.category === "electronics",
      ),
    ).toBe(true);

    const byLocation = await request(app)
      .get("/reports/search")
      .query({ location: "cafeteria" })
      .set("Authorization", `Bearer ${token}`);
    expect(byLocation.status).toBe(200);
    expect(
      byLocation.body.data.items.some((item: { title: string }) =>
        item.title.includes("found backpack"),
      ),
    ).toBe(true);

    const byDate = await request(app)
      .get("/reports/search")
      .query({
        dateFrom: "2026-10-04T00:00:00.000Z",
        dateTo: "2026-10-06T00:00:00.000Z",
        q: "Searchable",
      })
      .set("Authorization", `Bearer ${token}`);
    expect(byDate.status).toBe(200);
    expect(byDate.body.data.items).toHaveLength(1);
    expect(byDate.body.data.items[0].type).toBe("FOUND");
  });

  it("never returns private verification fields in search results", async () => {
    const response = await request(app)
      .get("/reports/search")
      .query({ q: "Searchable", pageSize: 50 })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThanOrEqual(2);

    const body = JSON.stringify(response.body);
    expect(body).not.toContain(secretMarker);
    expect(body).not.toContain("IMEI-SHOULD-NOT-APPEAR");
    expect(body).not.toContain("TAG-SHOULD-NOT-APPEAR");
    expect(body).not.toContain("private/found/should-not-appear.jpg");

    for (const item of response.body.data.items) {
      expect(item.privateDetails).toBeUndefined();
      expect(item.identifier).toBeUndefined();
      if (item.type === "FOUND") {
        expect(item.description).toBeUndefined();
        expect(item.imageRef).toBeUndefined();
        expect(item.publicDescription).toBeTruthy();
      }
    }
  });

  it("defaults to ACTIVE status and supports explicit status filter", async () => {
    const defaults = await request(app)
      .get("/reports/search")
      .query({ q: "Cancelled keys" })
      .set("Authorization", `Bearer ${token}`);
    expect(defaults.status).toBe(200);
    expect(defaults.body.data.items).toHaveLength(0);

    const cancelled = await request(app)
      .get("/reports/search")
      .query({ q: "Cancelled keys", status: "CANCELLED" })
      .set("Authorization", `Bearer ${token}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.items).toHaveLength(1);
    expect(cancelled.body.data.items[0].status).toBe("CANCELLED");
  });

  it("validates query parameters", async () => {
    const response = await request(app)
      .get("/reports/search")
      .query({ pageSize: 999, type: "NOT_A_TYPE" })
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
