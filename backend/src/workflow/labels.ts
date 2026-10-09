import type { ClaimStatus, MatchStatus, ReportStatus } from "@prisma/client";

/** Human-readable labels for API consumers (internal enums stay for contracts). */
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  POSSIBLE_MATCH: "Possible match",
  CLAIM_PENDING: "Claim pending",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  HANDOVER_PENDING: "Ready for handover",
  RETURNED: "Returned",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  SUBMITTED: "Submitted",
  NEEDS_MORE_INFO: "Needs more information",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  CLOSED: "Closed",
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  SUGGESTED: "Suggested",
  DISMISSED: "Dismissed",
  ACCEPTED_FOR_REVIEW: "Accepted for review",
  CLOSED: "Closed",
};

export function reportStatusLabel(status: ReportStatus): string {
  return REPORT_STATUS_LABELS[status];
}

export function claimStatusLabel(status: ClaimStatus): string {
  return CLAIM_STATUS_LABELS[status];
}

export function matchStatusLabel(status: MatchStatus): string {
  return MATCH_STATUS_LABELS[status];
}
