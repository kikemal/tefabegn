import { ReportStatus, ReportType } from "@prisma/client";
import { z } from "zod";
import { REPORT_CATEGORIES } from "../categories";

const reportStatuses = Object.values(ReportStatus) as [ReportStatus, ...ReportStatus[]];

export const searchReportsQuerySchema = z
  .object({
    category: z.enum(REPORT_CATEGORIES).optional(),
    location: z.string().trim().min(1).max(200).optional(),
    type: z.nativeEnum(ReportType).optional(),
    status: z.enum(reportStatuses).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    q: z.string().trim().min(1).max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine(
    (value) =>
      value.dateFrom === undefined ||
      value.dateTo === undefined ||
      value.dateFrom.getTime() <= value.dateTo.getTime(),
    { message: "dateFrom must be before or equal to dateTo", path: ["dateFrom"] },
  );

export type SearchReportsQuery = z.infer<typeof searchReportsQuerySchema>;
