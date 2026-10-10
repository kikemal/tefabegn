import {
  ClaimStatus,
  MatchStatus,
  Prisma,
  ReportStatus,
  ReportType,
  type Claim,
  type ItemReport,
  type Match,
} from "@prisma/client";

type ClaimWithFoundMatch = Claim & {
  foundReport: ItemReport | null;
  match: Match | null;
};
import { recordCaseEvent } from "../audit/service";
import { CaseEventType } from "../audit/types";
import { toClaimResponse } from "../claims/mappers";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../db/prisma";
import {
  notifyClaimApproved,
  notifyClaimRejected,
  notifyHandoverReady,
  notifyMoreInfoRequested,
} from "../notifications/emit";
import { toOwnerFoundReport, toOwnerLostReport, toPublicFoundReport } from "../reports/mappers";
import type { AuthenticatedUser } from "../types/auth";
import { toVerificationPackage } from "../verification/mappers";
import {
  ACTIVE_CLAIM_STATUSES,
  DECIDABLE_CLAIM_STATUSES,
  REPORT_STATUSES_APPROVABLE,
  REPORT_STATUSES_REVERT_AFTER_REJECT,
  assertClaimTransition,
  assertMatchTransition,
  assertReportTransition,
} from "../workflow";
import type { ReadyForHandoverInput, StaffClaimDecisionInput } from "./validation";

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
    assertClaimTransition(claim.status, ClaimStatus.NEEDS_MORE_INFO);
    const updated = await prisma.claim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.NEEDS_MORE_INFO },
      include: { foundReport: true, match: true },
    });

    await recordCaseEvent({
      reportId: updated.foundReportId ?? undefined,
      claimId: updated.id,
      actorId: staff.id,
      eventType: CaseEventType.CLAIM_MORE_INFO_REQUESTED,
      metadata: { notes: input.notes, decision: input.decision },
    });

    if (updated.foundReport) {
      await notifyMoreInfoRequested({
        claimId: updated.id,
        claimantId: updated.claimantId,
        foundReport: updated.foundReport,
      });
    }

    return { claim: toClaimResponse(updated), decision: input.decision };
  }

  if (input.decision === "REJECT") {
    assertClaimTransition(claim.status, ClaimStatus.REJECTED);
    const updated = await prisma.claim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.REJECTED },
      include: { foundReport: true, match: true },
    });

    const remainingActive = await prisma.claim.count({
      where: {
        foundReportId: claim.foundReportId!,
        id: { not: claimId },
        status: { in: [...ACTIVE_CLAIM_STATUSES] },
      },
    });

    if (
      remainingActive === 0 &&
      REPORT_STATUSES_REVERT_AFTER_REJECT.includes(claim.foundReport.status)
    ) {
      assertReportTransition(claim.foundReport.status, ReportStatus.ACTIVE);
      await prisma.itemReport.update({
        where: { id: claim.foundReport.id },
        data: { status: ReportStatus.ACTIVE },
      });
    }

    await recordCaseEvent({
      reportId: updated.foundReportId ?? undefined,
      claimId: updated.id,
      actorId: staff.id,
      eventType: CaseEventType.CLAIM_REJECTED,
      metadata: { notes: input.notes, decision: input.decision },
    });

    if (updated.foundReport) {
      await notifyClaimRejected({
        claimId: updated.id,
        claimantId: updated.claimantId,
        foundReport: updated.foundReport,
      });
    }

    return { claim: toClaimResponse(updated), decision: input.decision };
  }

  // APPROVE
  assertClaimTransition(claim.status, ClaimStatus.APPROVED);
  if (!REPORT_STATUSES_APPROVABLE.includes(claim.foundReport.status)) {
    throw new AppError(
      409,
      "INVALID_STATUS",
      "This found report cannot be approved in its current status",
    );
  }
  assertReportTransition(claim.foundReport.status, ReportStatus.APPROVED);

  let updated: ClaimWithFoundMatch;
  let rejectedCompetitors: { id: string; claimantId: string }[];

  try {
    ({ approved: updated, rejectedCompetitors } = await prisma.$transaction(async (tx) => {
      const alreadyApproved = await tx.claim.findFirst({
        where: {
          foundReportId: claim.foundReportId!,
          status: ClaimStatus.APPROVED,
          id: { not: claimId },
        },
        select: { id: true },
      });
      if (alreadyApproved) {
        throw new AppError(
          409,
          "INVALID_STATUS",
          "Another claim is already approved for this found item",
        );
      }

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
        const lost = claim.match.lostReport;
        if (REPORT_STATUSES_APPROVABLE.includes(lost.status)) {
          assertReportTransition(lost.status, ReportStatus.APPROVED);
          await tx.itemReport.update({
            where: { id: lost.id },
            data: { status: ReportStatus.APPROVED },
          });
        }
        assertMatchTransition(claim.match.status, MatchStatus.ACCEPTED_FOR_REVIEW);
        await tx.match.update({
          where: { id: claim.match.id },
          data: { status: MatchStatus.ACCEPTED_FOR_REVIEW },
        });
      }

      // Competing active claims on the same found item are rejected.
      const competitors = await tx.claim.findMany({
        where: {
          foundReportId: claim.foundReportId!,
          id: { not: claimId },
          status: { in: [...ACTIVE_CLAIM_STATUSES] },
        },
        select: { id: true, claimantId: true, status: true },
      });
      for (const competitor of competitors) {
        assertClaimTransition(competitor.status, ClaimStatus.REJECTED);
      }
      if (competitors.length > 0) {
        await tx.claim.updateMany({
          where: { id: { in: competitors.map((c) => c.id) } },
          data: { status: ClaimStatus.REJECTED },
        });
      }

      return {
        approved,
        rejectedCompetitors: competitors.map((c) => ({ id: c.id, claimantId: c.claimantId })),
      };
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(
        409,
        "INVALID_STATUS",
        "Another claim is already approved for this found item",
      );
    }
    throw error;
  }

  await recordCaseEvent({
    reportId: updated.foundReportId ?? undefined,
    claimId: updated.id,
    actorId: staff.id,
    eventType: CaseEventType.CLAIM_APPROVED,
    metadata: { notes: input.notes, decision: input.decision },
  });

  if (updated.foundReport) {
    await notifyClaimApproved({
      claimId: updated.id,
      claimantId: updated.claimantId,
      foundReport: updated.foundReport,
      lostReporterId: claim.match?.lostReport?.reporterId ?? null,
    });

    for (const competitor of rejectedCompetitors) {
      await notifyClaimRejected({
        claimId: competitor.id,
        claimantId: competitor.claimantId,
        foundReport: updated.foundReport,
      });
    }
  }

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

  assertReportTransition(report.status, ReportStatus.HANDOVER_PENDING);

  const approvedClaim = await prisma.claim.findFirst({
    where: { foundReportId, status: ClaimStatus.APPROVED },
    include: { match: { include: { lostReport: true } } },
  });
  if (!approvedClaim) {
    throw new AppError(409, "INVALID_STATUS", "An approved claim is required before handover");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const foundUpdated = await tx.itemReport.update({
      where: { id: foundReportId },
      data: { status: ReportStatus.HANDOVER_PENDING },
    });

    const lost = approvedClaim.match?.lostReport;
    if (lost && lost.status === ReportStatus.APPROVED) {
      assertReportTransition(lost.status, ReportStatus.HANDOVER_PENDING);
      await tx.itemReport.update({
        where: { id: lost.id },
        data: { status: ReportStatus.HANDOVER_PENDING },
      });
    }

    return foundUpdated;
  });

  await recordCaseEvent({
    reportId: foundReportId,
    claimId: approvedClaim.id,
    actorId: staff.id,
    eventType: CaseEventType.HANDOVER_READY,
    metadata: {
      notes: input.notes ?? null,
      publicSummary: toPublicFoundReport(updated),
      lostReportId: approvedClaim.match?.lostReportId ?? null,
    },
  });

  await notifyHandoverReady({
    claimId: approvedClaim.id,
    claimantId: approvedClaim.claimantId,
    foundReport: updated,
  });

  return {
    report: toOwnerFoundReport(updated),
    claimId: approvedClaim.id,
  };
}
