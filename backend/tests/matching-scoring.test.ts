import type { ItemReport } from "@prisma/client";
import { ReportStatus, ReportType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { scoreLostFoundPair } from "../src/matching/scoring";

function report(partial: Partial<ItemReport> & Pick<ItemReport, "type" | "title">): ItemReport {
  const now = new Date("2026-10-08T12:00:00.000Z");
  return {
    id: partial.id ?? "id",
    type: partial.type,
    status: partial.status ?? ReportStatus.ACTIVE,
    category: partial.category ?? "electronics",
    title: partial.title,
    description: partial.description ?? "",
    location: partial.location ?? "Library",
    eventOccurredAt: partial.eventOccurredAt ?? now,
    publicDescription: partial.publicDescription ?? null,
    privateDetails: partial.privateDetails ?? null,
    identifier: partial.identifier ?? null,
    imageRef: partial.imageRef ?? null,
    shareRef: partial.shareRef ?? null,
    returnedAt: partial.returnedAt ?? null,
    reporterId: partial.reporterId ?? "user",
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

describe("match scoring", () => {
  it("ranks a strong lost/found pair above a weak pair", () => {
    const lost = report({
      type: ReportType.LOST,
      title: "Black Dell laptop",
      description: "Dell laptop with campus sticker",
      category: "electronics",
      location: "Main Library",
      identifier: "SN-12345",
      eventOccurredAt: new Date("2026-10-08T10:00:00.000Z"),
    });

    const strongFound = report({
      type: ReportType.FOUND,
      title: "Black Dell laptop",
      description: "Dell laptop recovered",
      publicDescription: "Black laptop near library desk",
      category: "electronics",
      location: "Main Library",
      identifier: "SN-12345",
      eventOccurredAt: new Date("2026-10-08T15:00:00.000Z"),
    });

    const weakFound = report({
      id: "weak",
      type: ReportType.FOUND,
      title: "Red water bottle",
      description: "Plastic bottle",
      publicDescription: "Red bottle",
      category: "other",
      location: "Gym",
      eventOccurredAt: new Date("2026-09-01T15:00:00.000Z"),
    });

    const strong = scoreLostFoundPair(lost, strongFound);
    const weak = scoreLostFoundPair(lost, weakFound);

    expect(strong.score).toBeGreaterThan(weak.score);
    expect(
      strong.signals.some((signal) => signal.signal === "identifier" && signal.contribution > 0),
    ).toBe(true);
    expect(strong.signals.every((signal) => !signal.reason.includes("SN-12345"))).toBe(true);
  });

  it("is deterministic for the same inputs", () => {
    const lost = report({
      type: ReportType.LOST,
      title: "Blue backpack",
      description: "Nike backpack",
      category: "bags",
      location: "Cafeteria",
    });
    const found = report({
      type: ReportType.FOUND,
      title: "Blue Nike backpack",
      publicDescription: "Blue backpack",
      description: "Nike bag",
      category: "bags",
      location: "Student Cafeteria",
    });

    const first = scoreLostFoundPair(lost, found);
    const second = scoreLostFoundPair(lost, found);
    expect(first).toEqual(second);
  });
});
