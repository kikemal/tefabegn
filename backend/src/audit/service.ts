import type { Prisma } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../db/prisma";
import { toCaseEventResponse } from "./mappers";
import { sanitizeAuditMetadata } from "./sanitize";

export type RecordCaseEventInput = {
  reportId?: string;
  claimId?: string;
  actorId?: string;
  eventType: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Append-only case/audit write path.
 * Application code must never update or delete CaseEvent rows through this module.
 */
export async function recordCaseEvent(input: RecordCaseEventInput): Promise<void> {
  await prisma.caseEvent.create({
    data: {
      reportId: input.reportId,
      claimId: input.claimId,
      actorId: input.actorId,
      eventType: input.eventType,
      metadata: sanitizeAuditMetadata(input.metadata),
    },
  });
}

async function loadReportOrThrow(reportId: string) {
  const report = await prisma.itemReport.findUnique({ where: { id: reportId } });
  if (!report) {
    throw new AppError(404, "REPORT_NOT_FOUND", "Report not found");
  }
  return report;
}

async function loadClaimOrThrow(claimId: string) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) {
    throw new AppError(404, "CLAIM_NOT_FOUND", "Claim not found");
  }
  return claim;
}

/**
 * Chronological chain-of-custody for a report (and related claim events for that report).
 */
export async function getAuditHistoryForReport(reportId: string) {
  await loadReportOrThrow(reportId);

  const events = await prisma.caseEvent.findMany({
    where: { reportId },
    include: {
      actor: {
        select: { id: true, fullName: true, role: true },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return {
    reportId,
    events: events.map(toCaseEventResponse),
  };
}

/**
 * Chronological chain-of-custody for a claim, including related report events when linked.
 */
export async function getAuditHistoryForClaim(claimId: string) {
  const claim = await loadClaimOrThrow(claimId);

  const events = await prisma.caseEvent.findMany({
    where: {
      OR: [{ claimId }, ...(claim.foundReportId ? [{ reportId: claim.foundReportId }] : [])],
    },
    include: {
      actor: {
        select: { id: true, fullName: true, role: true },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  // Deduplicate if an event matches both claimId and reportId filters.
  const seen = new Set<string>();
  const unique = events.filter((event) => {
    if (seen.has(event.id)) {
      return false;
    }
    seen.add(event.id);
    return true;
  });

  return {
    claimId,
    foundReportId: claim.foundReportId,
    events: unique.map(toCaseEventResponse),
  };
}
