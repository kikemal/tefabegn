import { Prisma } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { checkDatabaseConnection, disconnectDatabase, prisma } from "../src/db/prisma";

const requiredModels = [
  "User",
  "ItemReport",
  "Match",
  "Claim",
  "Notification",
  "CaseEvent",
] as const;

describe("Prisma schema foundation", () => {
  it("exposes the required core models", () => {
    const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);

    for (const name of requiredModels) {
      expect(modelNames).toContain(name);
    }
  });

  it("defines explicit relations for ItemReport matches and claims", () => {
    const itemReport = Prisma.dmmf.datamodel.models.find((model) => model.name === "ItemReport");
    expect(itemReport).toBeDefined();

    const fieldNames = itemReport!.fields.map((field) => field.name);
    expect(fieldNames).toEqual(
      expect.arrayContaining([
        "reporter",
        "lostMatches",
        "foundMatches",
        "claims",
        "caseEvents",
        "privateDetails",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("keeps CaseEvent append-oriented without updatedAt", () => {
    const caseEvent = Prisma.dmmf.datamodel.models.find((model) => model.name === "CaseEvent");
    expect(caseEvent).toBeDefined();

    const fieldNames = caseEvent!.fields.map((field) => field.name);
    expect(fieldNames).toContain("createdAt");
    expect(fieldNames).not.toContain("updatedAt");
  });
});

describe("database connection", () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  it("connects to PostgreSQL and responds to a ping", async () => {
    await expect(checkDatabaseConnection()).resolves.toBe(true);
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1::int AS ok`;
    expect(rows[0]?.ok).toBe(1);
  });
});
