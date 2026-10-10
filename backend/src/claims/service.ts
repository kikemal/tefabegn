import {
  ClaimStatus,
  MatchStatus,
  Prisma,
  ReportStatus,
  ReportType,
  Role,
  type Claim,
  type ItemReport,
  type Match,
} from "@prisma/client";
import { recordCaseEvent } from "../audit/service";
import { CaseEventType } from "../audit/types";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../db/prisma";
import type { AuthenticatedUser } from "../types/auth";
import { notifyClaimSubmitted } from "../notifications/emit";
import {
  ACTIVE_CLAIM_STATUSES,
  CLAIMABLE_FOUND_STATUSES,
  REPORT_STATUSES_ENTERING_CLAIM,
  WITHDRAWABLE_CLAIM_STATUSES,
  assertClaimTransition,
  assertReportTransition,
} from "../workflow";
import { toClaimResponse } from "./mappers";
import type { CreateClaimInput } from "./validation";

function isClaimUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function resolveReportStatusAfterLastClaim(
  tx: Prisma.TransactionClient,
  reportId: string,
  current: ReportStatus,
): Promise<void> {
  if (current !== ReportStatus.CLAIM_PENDING) {
    return;
  }

  const hasSuggestion = await tx.match.findFirst({
    where: {
      status: MatchStatus.SUGGESTED,
      OR: [{ lostReportId: reportId }, { foundReportId: reportId }],
    },
    select: { id: true },
  });
  const next = hasSuggestion ? ReportStatus.POSSIBLE_MATCH : ReportStatus.ACTIVE;
  assertReportTransition(current, next);
  await tx.itemReport.update({
    where: { id: reportId },
    data: { status: next },
  });
}

type ClaimWithRelations = Claim & {
  foundReport: ItemReport | null;
  match: Match | null;
};

function assertCanViewClaim(
  viewer: AuthenticatedUser,
  claim: { claimantId: string; foundReport: ItemReport | null },
  lostReporterId?: string | null,
): void {
  if (viewer.role === Role.STAFF) {
    return;
  }
  if (viewer.id === claim.claimantId) {
    return;
  }
  if (claim.foundReport && viewer.id === claim.foundReport.reporterId) {
    return;
  }
  if (lostReporterId && viewer.id === lostReporterId) {
    return;
  }
  throw new AppError(403, "FORBIDDEN", "You are not allowed to view this claim");
}

export async function createClaim(user: AuthenticatedUser, input: CreateClaimInput) {
  let match: Match | null = null;
  let foundReport: ItemReport | null = null;
  let lostReport: ItemReport | null = null;

  if (input.matchId) {
    const loaded = await prisma.match.findUnique({
      where: { id: input.matchId },
      include: { lostReport: true, foundReport: true },
    });
    if (!loaded) {
      throw new AppError(404, "MATCH_NOT_FOUND", "Match not found");
    }

    match = loaded;
    foundReport = loaded.foundReport;
    lostReport = loaded.lostReport;

    if (input.foundReportId && input.foundReportId !== foundReport.id) {
      throw new AppError(400, "VALIDATION_ERROR", "foundReportId does not match the given match");
    }
  }

  if (!foundReport && input.foundReportId) {
    foundReport = await prisma.itemReport.findUnique({ where: { id: input.foundReportId } });
  }

  if (!foundReport || foundReport.type !== ReportType.FOUND) {
    throw new AppError(404, "REPORT_NOT_FOUND", "Found report not found");
  }

  if (!CLAIMABLE_FOUND_STATUSES.includes(foundReport.status)) {
    throw new AppError(409, "INVALID_STATUS", "This found report cannot be claimed");
  }

  if (foundReport.reporterId === user.id) {
    throw new AppError(403, "FORBIDDEN", "You cannot claim an item you reported as found");
  }

  if (match && lostReport && lostReport.reporterId !== user.id && user.role !== Role.STAFF) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Only the related lost-report owner can claim via this match",
    );
  }

  const foundReportId = foundReport.id;
  const lostReportId = lostReport?.id ?? null;
  const matchId = match?.id ?? null;

  let claim: ClaimWithRelations;
  let conflictingCount: number;

  try {
    ({ claim, conflictingCount } = await prisma.$transaction(async (tx) => {
      const lockedFound = await tx.itemReport.findUnique({ where: { id: foundReportId } });
      if (!lockedFound || lockedFound.type !== ReportType.FOUND) {
        throw new AppError(404, "REPORT_NOT_FOUND", "Found report not found");
      }
      if (!CLAIMABLE_FOUND_STATUSES.includes(lockedFound.status)) {
        throw new AppError(409, "INVALID_STATUS", "This found report cannot be claimed");
      }

      const existingActive = await tx.claim.findFirst({
        where: {
          claimantId: user.id,
          foundReportId,
          status: { in: [...ACTIVE_CLAIM_STATUSES] },
        },
      });
      if (existingActive) {
        throw new AppError(
          409,
          "DUPLICATE_CLAIM",
          "You already have an active claim on this found item",
        );
      }

      const competitors = await tx.claim.count({
        where: {
          foundReportId,
          status: { in: [...ACTIVE_CLAIM_STATUSES] },
        },
      });

      const created = await tx.claim.create({
        data: {
          claimantId: user.id,
          foundReportId,
          matchId,
          message: input.message,
          evidence: input.evidence,
          proofRef: input.proofRef,
          status: ClaimStatus.SUBMITTED,
        },
        include: {
          foundReport: true,
          match: true,
        },
      });

      if (REPORT_STATUSES_ENTERING_CLAIM.includes(lockedFound.status)) {
        assertReportTransition(lockedFound.status, ReportStatus.CLAIM_PENDING);
        await tx.itemReport.update({
          where: { id: foundReportId },
          data: { status: ReportStatus.CLAIM_PENDING },
        });
      }

      if (lostReportId) {
        const lockedLost = await tx.itemReport.findUnique({ where: { id: lostReportId } });
        if (lockedLost && REPORT_STATUSES_ENTERING_CLAIM.includes(lockedLost.status)) {
          assertReportTransition(lockedLost.status, ReportStatus.CLAIM_PENDING);
          await tx.itemReport.update({
            where: { id: lostReportId },
            data: { status: ReportStatus.CLAIM_PENDING },
          });
        }
      }

      return { claim: created, conflictingCount: competitors };
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (isClaimUniqueViolation(error)) {
      throw new AppError(
        409,
        "DUPLICATE_CLAIM",
        "You already have an active claim on this found item",
      );
    }
    throw error;
  }

  await recordCaseEvent({
    reportId: foundReportId,
    claimId: claim.id,
    actorId: user.id,
    eventType: CaseEventType.CLAIM_SUBMITTED,
    metadata: {
      matchId,
      conflictingActiveClaims: conflictingCount,
    },
  });

  await notifyClaimSubmitted({
    claimId: claim.id,
    claimantId: user.id,
    foundReport: claim.foundReport ?? foundReport,
    lostReporterId: lostReport?.reporterId ?? null,
  });

  return {
    claim: toClaimResponse(claim, user),
    conflictingActiveClaims: conflictingCount,
  };
}

export async function listMyClaims(user: AuthenticatedUser) {
  const claims = await prisma.claim.findMany({
    where: { claimantId: user.id },
    include: { foundReport: true, match: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
  });
  return claims.map((claim) => toClaimResponse(claim, user));
}

export async function getClaimById(viewer: AuthenticatedUser, claimId: string) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      foundReport: true,
      match: {
        include: { lostReport: true },
      },
    },
  });

  if (!claim) {
    throw new AppError(404, "CLAIM_NOT_FOUND", "Claim not found");
  }

  const lostReporterId = claim.match?.lostReport.reporterId ?? null;
  assertCanViewClaim(viewer, claim, lostReporterId);

  const responseSource: ClaimWithRelations = {
    ...claim,
    match: claim.match
      ? {
          id: claim.match.id,
          lostReportId: claim.match.lostReportId,
          foundReportId: claim.match.foundReportId,
          score: claim.match.score,
          reasons: claim.match.reasons,
          status: claim.match.status,
          createdAt: claim.match.createdAt,
          updatedAt: claim.match.updatedAt,
        }
      : null,
  };

  return toClaimResponse(responseSource, viewer);
}

export async function withdrawClaim(user: AuthenticatedUser, claimId: string) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { foundReport: true, match: true },
  });

  if (!claim) {
    throw new AppError(404, "CLAIM_NOT_FOUND", "Claim not found");
  }
  if (claim.claimantId !== user.id && user.role !== Role.STAFF) {
    throw new AppError(403, "FORBIDDEN", "You are not allowed to withdraw this claim");
  }
  if (!WITHDRAWABLE_CLAIM_STATUSES.includes(claim.status)) {
    throw new AppError(409, "INVALID_STATUS", "This claim cannot be withdrawn");
  }

  assertClaimTransition(claim.status, ClaimStatus.WITHDRAWN);

  const updated = await prisma.$transaction(async (tx) => {
    const withdrawn = await tx.claim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.WITHDRAWN },
      include: { foundReport: true, match: true },
    });

    if (!withdrawn.foundReportId) {
      return withdrawn;
    }

    const remainingActive = await tx.claim.count({
      where: {
        foundReportId: withdrawn.foundReportId,
        status: { in: [...ACTIVE_CLAIM_STATUSES] },
      },
    });

    if (remainingActive === 0) {
      const found = await tx.itemReport.findUnique({ where: { id: withdrawn.foundReportId } });
      if (found) {
        await resolveReportStatusAfterLastClaim(tx, found.id, found.status);
      }

      if (withdrawn.matchId) {
        const linkedMatch = await tx.match.findUnique({
          where: { id: withdrawn.matchId },
          include: { lostReport: true },
        });
        if (linkedMatch) {
          await resolveReportStatusAfterLastClaim(
            tx,
            linkedMatch.lostReport.id,
            linkedMatch.lostReport.status,
          );
        }
      }
    }

    return withdrawn;
  });

  await recordCaseEvent({
    reportId: updated.foundReportId ?? undefined,
    claimId: updated.id,
    actorId: user.id,
    eventType: CaseEventType.CLAIM_WITHDRAWN,
  });

  return toClaimResponse(updated, user);
}
