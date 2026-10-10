import { ClaimStatus, ReportStatus, ReportType, type Claim, type ItemReport } from "@prisma/client";
import { recordCaseEvent } from "../audit/service";
import { CaseEventType } from "../audit/types";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../db/prisma";
import { notifyMoreInfoRequested } from "../notifications/emit";
import type { AuthenticatedUser } from "../types/auth";
import {
  REPORT_STATUSES_ENTERING_REVIEW,
  VERIFIABLE_CLAIM_STATUSES,
  assertClaimTransition,
  assertReportTransition,
} from "../workflow";
import { toVerificationPackage } from "./mappers";
import type { RecordVerificationAttemptInput } from "./validation";

type ClaimWithFound = Claim & { foundReport: ItemReport };

async function loadClaimForVerification(claimId: string): Promise<ClaimWithFound> {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { foundReport: true },
  });

  if (!claim || !claim.foundReport || claim.foundReport.type !== ReportType.FOUND) {
    throw new AppError(404, "CLAIM_NOT_FOUND", "Claim not found");
  }

  return claim as ClaimWithFound;
}

export async function getVerificationPackage(claimId: string) {
  const claim = await loadClaimForVerification(claimId);
  return toVerificationPackage(claim);
}

export async function listClaimsForVerification() {
  const claims = await prisma.claim.findMany({
    where: {
      status: { in: [...VERIFIABLE_CLAIM_STATUSES] },
      foundReportId: { not: null },
    },
    include: { foundReport: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 100,
  });

  return claims.flatMap((claim) => {
    if (!claim.foundReport) {
      return [];
    }
    const packed = toVerificationPackage(claim as ClaimWithFound);
    return [
      {
        claimId: claim.id,
        claimStatus: claim.status,
        claimantId: claim.claimantId,
        foundReportId: claim.foundReportId,
        createdAt: claim.createdAt.toISOString(),
        publicFound: packed.publicFound,
      },
    ];
  });
}

/**
 * Records a staff verification attempt.
 * Never sets APPROVED/REJECTED — final decision belongs to staff review (TASK-011).
 */
export async function recordVerificationAttempt(
  staff: AuthenticatedUser,
  claimId: string,
  input: RecordVerificationAttemptInput,
) {
  const claim = await loadClaimForVerification(claimId);

  if (!VERIFIABLE_CLAIM_STATUSES.includes(claim.status)) {
    throw new AppError(
      409,
      "INVALID_STATUS",
      "This claim cannot be verified in its current status",
    );
  }

  const nextStatus = input.requestMoreInfo ? ClaimStatus.NEEDS_MORE_INFO : ClaimStatus.UNDER_REVIEW;
  assertClaimTransition(claim.status, nextStatus);

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: { status: nextStatus },
    include: { foundReport: true },
  });

  if (!updated.foundReport) {
    throw new AppError(404, "CLAIM_NOT_FOUND", "Claim not found");
  }

  if (REPORT_STATUSES_ENTERING_REVIEW.includes(updated.foundReport.status)) {
    assertReportTransition(updated.foundReport.status, ReportStatus.UNDER_REVIEW);
    await prisma.itemReport.update({
      where: { id: updated.foundReport.id },
      data: { status: ReportStatus.UNDER_REVIEW },
    });
  }

  await recordCaseEvent({
    reportId: updated.foundReportId ?? undefined,
    claimId: updated.id,
    actorId: staff.id,
    eventType: CaseEventType.VERIFICATION_RECORDED,
    metadata: {
      assessment: input.assessment,
      notes: input.notes,
      requestMoreInfo: input.requestMoreInfo,
      resultingStatus: nextStatus,
      autoApproved: false,
    },
  });

  if (input.requestMoreInfo && updated.foundReport) {
    await notifyMoreInfoRequested({
      claimId: updated.id,
      claimantId: updated.claimantId,
      foundReport: updated.foundReport,
    });
  }

  return {
    verification: toVerificationPackage(updated as ClaimWithFound),
    attempt: {
      assessment: input.assessment,
      notes: input.notes,
      requestMoreInfo: input.requestMoreInfo,
      resultingStatus: nextStatus,
      autoApproved: false as const,
    },
  };
}
