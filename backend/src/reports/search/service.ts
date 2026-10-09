import { ReportStatus, ReportType, type ItemReport, type Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import {
  toPublicFoundReport,
  toPublicLostReport,
  type PublicFoundReport,
  type PublicLostReport,
} from "../mappers";
import type { SearchReportsQuery } from "./validation";

export type PublicSearchReport = PublicLostReport | PublicFoundReport;

export type SearchReportsResult = {
  items: PublicSearchReport[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function buildWhere(query: SearchReportsQuery): Prisma.ItemReportWhereInput {
  const where: Prisma.ItemReportWhereInput = {
    // Public search defaults to ACTIVE unless a status filter is provided.
    status: query.status ?? ReportStatus.ACTIVE,
  };

  if (query.category) {
    where.category = query.category;
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.location) {
    where.location = { contains: query.location, mode: "insensitive" };
  }

  if (query.dateFrom || query.dateTo) {
    where.eventOccurredAt = {
      ...(query.dateFrom ? { gte: query.dateFrom } : {}),
      ...(query.dateTo ? { lte: query.dateTo } : {}),
    };
  }

  if (query.q) {
    // Search only public-safe text fields — never privateDetails/identifier.
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { location: { contains: query.q, mode: "insensitive" } },
      { publicDescription: { contains: query.q, mode: "insensitive" } },
      {
        AND: [
          { type: ReportType.LOST },
          { description: { contains: query.q, mode: "insensitive" } },
        ],
      },
      { shareRef: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

function toPublicSearchItem(report: ItemReport): PublicSearchReport {
  if (report.type === ReportType.FOUND) {
    return toPublicFoundReport(report);
  }
  return toPublicLostReport(report);
}

export async function searchReports(query: SearchReportsQuery): Promise<SearchReportsResult> {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.pageSize;

  const [total, reports] = await prisma.$transaction([
    prisma.itemReport.count({ where }),
    prisma.itemReport.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: query.pageSize,
    }),
  ]);

  return {
    items: reports.map(toPublicSearchItem),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    },
  };
}
