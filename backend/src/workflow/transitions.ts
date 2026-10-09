import { ClaimStatus, MatchStatus, ReportStatus } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { claimStatusLabel, matchStatusLabel, reportStatusLabel } from "./labels";

/**
 * Allowed report status transitions (TASK-012 / TASK-013).
 */
export const REPORT_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  DRAFT: [ReportStatus.ACTIVE, ReportStatus.CANCELLED, ReportStatus.CLOSED],
  ACTIVE: [
    ReportStatus.POSSIBLE_MATCH,
    ReportStatus.CLAIM_PENDING,
    ReportStatus.CANCELLED,
    ReportStatus.CLOSED,
  ],
  POSSIBLE_MATCH: [
    ReportStatus.CLAIM_PENDING,
    ReportStatus.APPROVED,
    ReportStatus.ACTIVE,
    ReportStatus.CANCELLED,
  ],
  CLAIM_PENDING: [
    ReportStatus.UNDER_REVIEW,
    ReportStatus.APPROVED,
    ReportStatus.ACTIVE,
    ReportStatus.POSSIBLE_MATCH,
    ReportStatus.CANCELLED,
  ],
  UNDER_REVIEW: [
    ReportStatus.APPROVED,
    ReportStatus.CLAIM_PENDING,
    ReportStatus.ACTIVE,
    ReportStatus.REJECTED,
  ],
  APPROVED: [ReportStatus.HANDOVER_PENDING, ReportStatus.RETURNED, ReportStatus.CLOSED],
  REJECTED: [ReportStatus.CLOSED, ReportStatus.ACTIVE],
  HANDOVER_PENDING: [ReportStatus.RETURNED, ReportStatus.CLOSED],
  RETURNED: [ReportStatus.CLOSED],
  CLOSED: [],
  CANCELLED: [],
};

export const CLAIM_TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  SUBMITTED: [
    ClaimStatus.NEEDS_MORE_INFO,
    ClaimStatus.UNDER_REVIEW,
    ClaimStatus.APPROVED,
    ClaimStatus.REJECTED,
    ClaimStatus.WITHDRAWN,
  ],
  NEEDS_MORE_INFO: [
    ClaimStatus.UNDER_REVIEW,
    ClaimStatus.APPROVED,
    ClaimStatus.REJECTED,
    ClaimStatus.WITHDRAWN,
  ],
  UNDER_REVIEW: [ClaimStatus.NEEDS_MORE_INFO, ClaimStatus.APPROVED, ClaimStatus.REJECTED],
  APPROVED: [ClaimStatus.CLOSED],
  REJECTED: [ClaimStatus.CLOSED],
  WITHDRAWN: [ClaimStatus.CLOSED],
  CLOSED: [],
};

export const MATCH_TRANSITIONS: Record<MatchStatus, readonly MatchStatus[]> = {
  SUGGESTED: [MatchStatus.DISMISSED, MatchStatus.ACCEPTED_FOR_REVIEW, MatchStatus.CLOSED],
  DISMISSED: [MatchStatus.CLOSED],
  ACCEPTED_FOR_REVIEW: [MatchStatus.CLOSED],
  CLOSED: [],
};

export const OWNER_EDITABLE_REPORT_STATUSES: readonly ReportStatus[] = [
  ReportStatus.DRAFT,
  ReportStatus.ACTIVE,
];

export const OWNER_CANCELLABLE_REPORT_STATUSES: readonly ReportStatus[] = [
  ReportStatus.DRAFT,
  ReportStatus.ACTIVE,
  ReportStatus.POSSIBLE_MATCH,
];

export const OWNER_CLOSEABLE_REPORT_STATUSES: readonly ReportStatus[] = [
  ReportStatus.DRAFT,
  ReportStatus.ACTIVE,
];

/** Found reports that may still accept a new claim. */
export const CLAIMABLE_FOUND_STATUSES: readonly ReportStatus[] = [
  ReportStatus.ACTIVE,
  ReportStatus.POSSIBLE_MATCH,
  ReportStatus.CLAIM_PENDING,
  ReportStatus.UNDER_REVIEW,
];

/** Reports that move to CLAIM_PENDING when a claim is filed. */
export const REPORT_STATUSES_ENTERING_CLAIM: readonly ReportStatus[] = [
  ReportStatus.ACTIVE,
  ReportStatus.POSSIBLE_MATCH,
];

export const REPORT_STATUSES_ENTERING_REVIEW: readonly ReportStatus[] = [
  ReportStatus.CLAIM_PENDING,
];

/** Report statuses that may move to APPROVED when staff approve a claim. */
export const REPORT_STATUSES_APPROVABLE: readonly ReportStatus[] = [
  ReportStatus.CLAIM_PENDING,
  ReportStatus.UNDER_REVIEW,
  ReportStatus.POSSIBLE_MATCH,
];

export const REPORT_STATUSES_REVERT_AFTER_REJECT: readonly ReportStatus[] = [
  ReportStatus.CLAIM_PENDING,
  ReportStatus.UNDER_REVIEW,
];

export const MATCHABLE_REPORT_STATUSES: readonly ReportStatus[] = [
  ReportStatus.ACTIVE,
  ReportStatus.POSSIBLE_MATCH,
];

export const ACTIVE_CLAIM_STATUSES: readonly ClaimStatus[] = [
  ClaimStatus.SUBMITTED,
  ClaimStatus.NEEDS_MORE_INFO,
  ClaimStatus.UNDER_REVIEW,
];

export const DECIDABLE_CLAIM_STATUSES: readonly ClaimStatus[] = [
  ClaimStatus.SUBMITTED,
  ClaimStatus.NEEDS_MORE_INFO,
  ClaimStatus.UNDER_REVIEW,
];

export const VERIFIABLE_CLAIM_STATUSES: readonly ClaimStatus[] = [
  ClaimStatus.SUBMITTED,
  ClaimStatus.NEEDS_MORE_INFO,
  ClaimStatus.UNDER_REVIEW,
];

export const WITHDRAWABLE_CLAIM_STATUSES: readonly ClaimStatus[] = [
  ClaimStatus.SUBMITTED,
  ClaimStatus.NEEDS_MORE_INFO,
];

export function canTransitionReport(from: ReportStatus, to: ReportStatus): boolean {
  if (from === to) {
    return true;
  }
  return REPORT_TRANSITIONS[from].includes(to);
}

export function canTransitionClaim(from: ClaimStatus, to: ClaimStatus): boolean {
  if (from === to) {
    return true;
  }
  return CLAIM_TRANSITIONS[from].includes(to);
}

export function canTransitionMatch(from: MatchStatus, to: MatchStatus): boolean {
  if (from === to) {
    return true;
  }
  return MATCH_TRANSITIONS[from].includes(to);
}

export function assertReportTransition(from: ReportStatus, to: ReportStatus): void {
  if (canTransitionReport(from, to)) {
    return;
  }
  throw new AppError(
    409,
    "INVALID_STATUS",
    `Cannot move report from "${reportStatusLabel(from)}" to "${reportStatusLabel(to)}"`,
  );
}

export function assertClaimTransition(from: ClaimStatus, to: ClaimStatus): void {
  if (canTransitionClaim(from, to)) {
    return;
  }
  throw new AppError(
    409,
    "INVALID_STATUS",
    `Cannot move claim from "${claimStatusLabel(from)}" to "${claimStatusLabel(to)}"`,
  );
}

export function assertMatchTransition(from: MatchStatus, to: MatchStatus): void {
  if (canTransitionMatch(from, to)) {
    return;
  }
  throw new AppError(
    409,
    "INVALID_STATUS",
    `Cannot move match from "${matchStatusLabel(from)}" to "${matchStatusLabel(to)}"`,
  );
}
