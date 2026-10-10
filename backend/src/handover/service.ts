import {
  ClaimStatus,
  MatchStatus,
  ReportStatus,
  ReportType,
  Role,
  type Claim,
  type ItemReport,
  type Match,
} from "@prisma/client";
import { recordCaseEvent } from "../audit/service";
import { CaseEventType } from "../audit/types";
import { toClaimResponse } from "../claims/mappers";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/errorHandler";
import { notifyCaseClosed, notifyItemReturned } from "../notifications/emit";
import { toOwnerFoundReport, toOwnerLostReport } from "../reports/mappers";
import type { AuthenticatedUser } from "../types/auth";
import { assertClaimTransition, assertMatchTransition, assertReportTransition } from "../workflow";
import type { CloseCaseInput, ConfirmReceiptInput, ConfirmReturnInput } from "./validation";

type ClaimWithRelations = Claim & {
  foundReport: ItemReport | null;
  match: (Match & { lostReport: ItemReport }) | null;
};

async function loadFoundOrThrow(foundReportId: string): Promise<ItemReport> {
  const report = await prisma.itemReport.findUnique({ where: { id: foundReportId } });
  if (!report || report.type !== ReportType.FOUND) {
    throw new AppError(404, "REPORT_NOT_FOUND", "Found report not found");
  }
  return report;
}

async function loadApprovedClaimForFound(foundReportId: string): Promise<ClaimWithRelations> {
  const claim = await prisma.claim.findFirst({
    where: { foundReportId, status: ClaimStatus.APPROVED },
    include: { foundReport: true, match: { include: { lostReport: true } } },
  });
  if (!claim) {
    throw new AppError(409, "INVALID_STATUS", "An approved claim is required");
  }
  return claim;
}

/**
 * Staff records physical return of a found item to the approved claimant.
 * Ordinary users cannot call this — enforced by staff-only routes.
 */
export async function confirmReturnByStaff(
  staff: AuthenticatedUser,
  foundReportId: string,
  input: ConfirmReturnInput,
) {
  const report = await loadFoundOrThrow(foundReportId);
  if (report.status !== ReportStatus.HANDOVER_PENDING) {
    throw new AppError(
      409,
      "INVALID_STATUS",
      "Only a handover-pending found item can be marked returned",
    );
  }

  assertReportTransition(report.status, ReportStatus.RETURNED);
  const approvedClaim = await loadApprovedClaimForFound(foundReportId);
  const returnedAt = input.returnedAt ? new Date(input.returnedAt) : new Date();
  if (Number.isNaN(returnedAt.getTime())) {
    throw new AppError(400, "VALIDATION_ERROR", "returnedAt must be a valid ISO datetime");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedFound = await tx.itemReport.update({
      where: { id: foundReportId },
      data: { status: ReportStatus.RETURNED, returnedAt },
    });

    let updatedLost: ItemReport | null = null;
    if (approvedClaim.match?.lostReport) {
      const lost = approvedClaim.match.lostReport;
      if (lost.status === ReportStatus.APPROVED || lost.status === ReportStatus.HANDOVER_PENDING) {
        assertReportTransition(lost.status, ReportStatus.RETURNED);
        updatedLost = await tx.itemReport.update({
          where: { id: lost.id },
          data: { status: ReportStatus.RETURNED, returnedAt },
        });
      }
    }

    return { updatedFound, updatedLost };
  });

  await recordCaseEvent({
    reportId: foundReportId,
    claimId: approvedClaim.id,
    actorId: staff.id,
    eventType: CaseEventType.HANDOVER_COMPLETED,
    metadata: {
      notes: input.notes ?? null,
      returnedAt: returnedAt.toISOString(),
      lostReportId: approvedClaim.match?.lostReportId ?? null,
    },
  });

  await notifyItemReturned({
    claimId: approvedClaim.id,
    claimantId: approvedClaim.claimantId,
    foundReport: result.updatedFound,
    lostReporterId: approvedClaim.match?.lostReport?.reporterId ?? null,
    returnedAt: returnedAt.toISOString(),
  });

  return {
    report: toOwnerFoundReport(result.updatedFound),
    lostReport: result.updatedLost ? toOwnerLostReport(result.updatedLost) : null,
    claimId: approvedClaim.id,
    returnedAt: returnedAt.toISOString(),
  };
}

/**
 * Approved claimant acknowledges receipt. Does not by itself mark the item returned.
 */
export async function confirmReceiptByClaimant(
  user: AuthenticatedUser,
  claimId: string,
  input: ConfirmReceiptInput,
) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { foundReport: true, match: true },
  });

  if (!claim) {
    throw new AppError(404, "CLAIM_NOT_FOUND", "Claim not found");
  }
  if (claim.claimantId !== user.id && user.role !== Role.STAFF) {
    throw new AppError(403, "FORBIDDEN", "Only the approved claimant can confirm receipt");
  }
  if (claim.status !== ClaimStatus.APPROVED) {
    throw new AppError(409, "INVALID_STATUS", "Only an approved claim can confirm receipt");
  }
  if (!claim.foundReport) {
    throw new AppError(409, "INVALID_STATUS", "Claim has no linked found report");
  }

  const foundStatus = claim.foundReport.status;
  if (foundStatus !== ReportStatus.HANDOVER_PENDING && foundStatus !== ReportStatus.RETURNED) {
    throw new AppError(
      409,
      "INVALID_STATUS",
      "Receipt can only be confirmed when the item is ready for handover or already returned",
    );
  }

  if (claim.recipientConfirmedAt) {
    return {
      claim: toClaimResponse(claim),
      alreadyConfirmed: true as const,
    };
  }

  const confirmedAt = new Date();
  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: { recipientConfirmedAt: confirmedAt },
    include: { foundReport: true, match: true },
  });

  await recordCaseEvent({
    reportId: claim.foundReportId ?? undefined,
    claimId: claim.id,
    actorId: user.id,
    eventType: CaseEventType.RETURN_CONFIRMED,
    metadata: {
      notes: input.notes ?? null,
      recipientConfirmedAt: confirmedAt.toISOString(),
      foundStatus,
    },
  });

  return {
    claim: toClaimResponse(updated),
    alreadyConfirmed: false as const,
  };
}

/**
 * Staff closes the case after physical return.
 */
export async function closeCaseByStaff(
  staff: AuthenticatedUser,
  foundReportId: string,
  input: CloseCaseInput,
) {
  const report = await loadFoundOrThrow(foundReportId);
  if (report.status !== ReportStatus.RETURNED) {
    throw new AppError(
      409,
      "INVALID_STATUS",
      "Only a returned found item can be closed as a completed case",
    );
  }

  assertReportTransition(report.status, ReportStatus.CLOSED);

  const linkedClaim = await prisma.claim.findFirst({
    where: {
      foundReportId,
      status: { in: [ClaimStatus.APPROVED, ClaimStatus.CLOSED] },
    },
    include: { match: { include: { lostReport: true } } },
    orderBy: [{ updatedAt: "desc" }],
  });

  if (!linkedClaim) {
    throw new AppError(409, "INVALID_STATUS", "An approved claim is required to close the case");
  }

  await prisma.$transaction(async (tx) => {
    await tx.itemReport.update({
      where: { id: foundReportId },
      data: { status: ReportStatus.CLOSED },
    });

    if (linkedClaim.match?.lostReport) {
      const lost = linkedClaim.match.lostReport;
      if (lost.status === ReportStatus.RETURNED || lost.status === ReportStatus.APPROVED) {
        assertReportTransition(lost.status, ReportStatus.CLOSED);
        await tx.itemReport.update({
          where: { id: lost.id },
          data: { status: ReportStatus.CLOSED },
        });
      }
    }

    if (linkedClaim.status === ClaimStatus.APPROVED) {
      assertClaimTransition(linkedClaim.status, ClaimStatus.CLOSED);
      await tx.claim.update({
        where: { id: linkedClaim.id },
        data: { status: ClaimStatus.CLOSED },
      });
    }

    if (linkedClaim.match && linkedClaim.match.status !== MatchStatus.CLOSED) {
      assertMatchTransition(linkedClaim.match.status, MatchStatus.CLOSED);
      await tx.match.update({
        where: { id: linkedClaim.match.id },
        data: { status: MatchStatus.CLOSED },
      });
    }
  });

  const closedFound = await prisma.itemReport.findUniqueOrThrow({ where: { id: foundReportId } });
  const closedClaim = await prisma.claim.findUniqueOrThrow({
    where: { id: linkedClaim.id },
    include: { foundReport: true, match: true },
  });
  const closedLost =
    linkedClaim.match?.lostReportId != null
      ? await prisma.itemReport.findUnique({ where: { id: linkedClaim.match.lostReportId } })
      : null;

  await recordCaseEvent({
    reportId: foundReportId,
    claimId: closedClaim.id,
    actorId: staff.id,
    eventType: CaseEventType.CASE_CLOSED,
    metadata: {
      notes: input.notes ?? null,
      returnedAt: report.returnedAt ? report.returnedAt.toISOString() : null,
      recipientConfirmedAt: closedClaim.recipientConfirmedAt
        ? closedClaim.recipientConfirmedAt.toISOString()
        : null,
    },
  });

  await notifyCaseClosed({
    claimId: closedClaim.id,
    claimantId: closedClaim.claimantId,
    foundReport: closedFound,
    lostReporterId: closedLost?.reporterId ?? null,
  });

  return {
    report: toOwnerFoundReport(closedFound),
    lostReport:
      closedLost && closedLost.type === ReportType.LOST ? toOwnerLostReport(closedLost) : null,
    claim: toClaimResponse(closedClaim),
  };
}
