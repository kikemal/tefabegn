import { ReportStatus, ReportType } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { toPublicRecentFoundReport, type PublicRecentFoundReport } from "./mappers";
import type { RecentFoundQuery } from "./validation";

const PUBLIC_FOUND_STATUSES = [ReportStatus.ACTIVE, ReportStatus.POSSIBLE_MATCH] as const;

export async function listRecentPublicFound(
  query: RecentFoundQuery,
): Promise<{ reports: PublicRecentFoundReport[] }> {
  const reports = await prisma.itemReport.findMany({
    where: {
      type: ReportType.FOUND,
      status: { in: [...PUBLIC_FOUND_STATUSES] },
    },
    orderBy: [{ eventOccurredAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: query.limit,
  });

  return {
    reports: reports.map(toPublicRecentFoundReport),
  };
}
