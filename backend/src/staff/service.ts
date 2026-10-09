import {
  ClaimStatus,
  MatchStatus,
  ReportStatus,
  ReportType,
  type ItemReport,
  type Prisma,
} from "@prisma/client";
import { toClaimResponse } from "../claims/mappers";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../db/prisma";
import { toOwnerFoundReport, toOwnerLostReport, toPublicFoundReport } from "../reports/mappers";
import type { AuthenticatedUser } from "../types/auth";
import { toVerificationPackage } from "../verification/mappers";
import type { ReadyForHandoverInput, StaffClaimDecisionInput } from "./validation";

const DECIDABLE_CLAIM_STATUSES: ClaimStatus[] = [
  ClaimStatus.SUBMITTED,
  ClaimStatus.NEEDS_MORE_INFO,
  ClaimStatus.UNDER_REVIEW,
];

const ACTIVE_CLAIM_STATUSES: ClaimStatus[] = [
  ClaimStatus.SUBMITTED,
  ClaimStatus.NEEDS_MORE_INFO,
  ClaimStatus.UNDER_REVIEW,
];

async function recordCaseEvent(input: {
  reportId?: string;
  claimId?: string;
  actorId: string;
  eventType: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.caseEvent.create({
    data: {
      reportId: input.reportId,
      claimId: input.claimId,
      actorId: input.actorId,
      eventType: input.eventType,
      metadata: input.metadata,
    },
  });
}

export async function listReportsForStaffReview() {
  const reports = await prisma.itemReport.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
  });

  return reports.map((report) =>
    report.type === ReportType.LOST ? toOwnerLostReport(report) : toOwnerFoundReport(report),
  );
}

export async function listMatchesForStaffReview() {
  const matches = await prisma.match.findMany({
    include: { lostReport: true, foundReport: true },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 100,
  });

  return matches.map((match) => ({
    id: match.id,
    score: match.score,
    status: match.status,
    reasons: match.reasons,
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
    lostReport: toOwnerLostReport(match.lostReport),
    foundReport: toOwnerFoundReport(match.foundReport),
  }));
}

export async function listClaimsForStaffReview() {
  const claims = await prisma.claim.findMany({
    include: { foundReport: true, match: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 100,
  });
  return claims.map((claim) => toClaimResponse(claim));
}

export async function getStaffClaimReview(claimId: string) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { foundReport: true, match: true },
  });

  if (!claim || !claim.foundReport) {
    throw new AppError(404, "CLAIM_NOT_FOUND", "Claim not found");
  }

  return {
    claim: toClaimResponse(claim),
    verification: toVerificationPackage({
      ...claim,
      foundReport: claim.foundReport,
    }),
  };
}

export async function decideClaim(
  staff: AuthenticatedUser,
  claimId: string,
  input: StaffClaimDecisionInput,
) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { foundReport: true, match: { include: { lostReport: true } } },
  });

  if (!claim || !claim.foundReport) {
    throw new AppError(404, "CLAIM_NOT_FOUND", "Claim not found");
  }
  if (!DECIDABLE_CLAIM_STATUSES.includes(claim.status)) {
    throw new AppError(409, "INVALID_STATUS", "This claim cannot be decided in its current status");
  }

  if (input.decision === "REQUEST_MORE_INFO") {
    const updated = await prisma.claim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.NEEDS_MORE_INFO },
      include: { foundReport: true, match: true },
    });

    await recordCaseEvent({
      reportId: updated.foundReportId ?? undefined,
      claimId: updated.id,
      actorId: staff.id,
      eventType: "CLAIM_MORE_INFO_REQUESTED",
      metadata: { notes: input.notes, decision: input.decision },
    });

    return { claim: toClaimResponse(updated), decision: input.decision };
  }

  if (input.decision === "REJECT") {
    const updated = await prisma.claim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.REJECTED },
      include: { foundReport: true, match: true },
    });

    const remainingActive = await prisma.claim.count({
      where: {
        foundReportId: claim.foundReportId!,
        id: { not: claimId },
        status: { in: ACTIVE_CLAIM_STATUSES },
      },
    });

    if (remainingActive === 0 && claim.foundReport.status === ReportStatus.CLAIM_PENDING) {
      await prisma.itemReport.update({
        where: { id: claim.foundReport.id },
        data: { status: ReportStatus.ACTIVE },
      });
    }

    await recordCaseEvent({
      reportId: updated.foundReportId ?? undefined,
      claimId: updated.id,
      actorId: staff.id,
      eventType: "CLAIM_REJECTED",
      metadata: { notes: input.notes, decision: input.decision },
    });

    return { claim: toClaimResponse(updated), decision: input.decision };
  }

  // APPROVE
  const updated = await prisma.$transaction(async (tx) => {
    const approved = await tx.claim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.APPROVED },
      include: { foundReport: true, match: true },
    });

    await tx.itemReport.update({
      where: { id: claim.foundReport!.id },
      data: { status: ReportStatus.APPROVED },
    });

    if (claim.match?.lostReport) {
      await tx.itemReport.update({
        where: { id: claim.match.lostReport.id },
        data: { status: ReportStatus.APPROVED },
      });
      await tx.match.update({
        where: { id: claim.match.id },
        data: { status: MatchStatus.ACCEPTED_FOR_REVIEW },
      });
    }

    // Competing active claims on the same found item are rejected.
    await tx.claim.updateMany({
      where: {
        foundReportId: claim.foundReportId!,
        id: { not: claimId },
        status: { in: ACTIVE_CLAIM_STATUSES },
      },
      data: { status: ClaimStatus.REJECTED },
    });

    return approved;
  });

  await recordCaseEvent({
    reportId: updated.foundReportId ?? undefined,
    claimId: updated.id,
    actorId: staff.id,
    eventType: "CLAIM_APPROVED",
    metadata: { notes: input.notes, decision: input.decision },
  });

  return { claim: toClaimResponse(updated), decision: input.decision };
}

export async function markFoundReadyForHandover(
  staff: AuthenticatedUser,
  foundReportId: string,
  input: ReadyForHandoverInput,
) {
  const report = await prisma.itemReport.findUnique({ where: { id: foundReportId } });
  if (!report || report.type !== ReportType.FOUND) {
    throw new AppError(404, "REPORT_NOT_FOUND", "Found report not found");
  }
  if (report.status !== ReportStatus.APPROVED) {
    throw new AppError(
      409,
      "INVALID_STATUS",
      "Only an approved found item can be marked ready for handover",
    );
  }

  const approvedClaim = await prisma.claim.findFirst({
    where: { foundReportId, status: ClaimStatus.APPROVED },
  });
  if (!approvedClaim) {
    throw new AppError(409, "INVALID_STATUS", "An approved claim is required before handover");
  }

  const updated: ItemReport = await prisma.itemReport.update({
    where: { id: foundReportId },
    data: { status: ReportStatus.HANDOVER_PENDING },
  });

  await recordCaseEvent({
    reportId: foundReportId,
    claimId: approvedClaim.id,
    actorId: staff.id,
    eventType: "HANDOVER_READY",
    metadata: {
      notes: input.notes ?? null,
      publicSummary: toPublicFoundReport(updated),
    },
  });

  return {
    report: toOwnerFoundReport(updated),
    claimId: approvedClaim.id,
  };
}
