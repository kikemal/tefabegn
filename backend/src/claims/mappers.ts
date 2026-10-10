import { Role, type Claim, type ItemReport, type Match } from "@prisma/client";
import { toPublicFoundReport, type PublicFoundReport } from "../reports/mappers";
import { claimStatusLabel, matchStatusLabel } from "../workflow";

export type ClaimMatchSummary = {
  id: string;
  score: number;
  status: Match["status"];
  statusLabel: string;
  lostReportId: string;
  foundReportId: string;
};

export type ClaimResponse = {
  id: string;
  status: Claim["status"];
  statusLabel: string;
  /**
   * Claimant private fields. Populated only for the claimant or staff.
   * Found reporters and other authorized summary viewers receive null.
   */
  message: string | null;
  evidence: string | null;
  proofRef: string | null;
  claimantId: string;
  foundReportId: string | null;
  matchId: string | null;
  recipientConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  foundReport: PublicFoundReport | null;
  match: ClaimMatchSummary | null;
};

type ClaimWithRelations = Claim & {
  foundReport: ItemReport | null;
  match: Match | null;
};

export type ClaimResponseViewer = {
  id: string;
  role: Role;
};

/** Claimant + staff may see submitted ownership evidence; peers (e.g. finders) may not. */
export function viewerMaySeeClaimantPrivateFields(
  viewer: ClaimResponseViewer,
  claim: { claimantId: string },
): boolean {
  if (viewer.role === Role.STAFF) {
    return true;
  }
  return viewer.id === claim.claimantId;
}

/**
 * Serialize a claim for a specific viewer.
 * Always embeds public-safe found data only (never found private evidence).
 */
export function toClaimResponse(
  claim: ClaimWithRelations,
  viewer: ClaimResponseViewer,
): ClaimResponse {
  const includePrivate = viewerMaySeeClaimantPrivateFields(viewer, claim);

  return {
    id: claim.id,
    status: claim.status,
    statusLabel: claimStatusLabel(claim.status),
    message: includePrivate ? claim.message : null,
    evidence: includePrivate ? claim.evidence : null,
    proofRef: includePrivate ? claim.proofRef : null,
    claimantId: claim.claimantId,
    foundReportId: claim.foundReportId,
    matchId: claim.matchId,
    recipientConfirmedAt: claim.recipientConfirmedAt
      ? claim.recipientConfirmedAt.toISOString()
      : null,
    createdAt: claim.createdAt.toISOString(),
    updatedAt: claim.updatedAt.toISOString(),
    foundReport: claim.foundReport ? toPublicFoundReport(claim.foundReport) : null,
    match: claim.match
      ? {
          id: claim.match.id,
          score: claim.match.score,
          status: claim.match.status,
          statusLabel: matchStatusLabel(claim.match.status),
          lostReportId: claim.match.lostReportId,
          foundReportId: claim.match.foundReportId,
        }
      : null,
  };
}
