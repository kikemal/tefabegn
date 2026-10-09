import type { Claim, ItemReport, Match } from "@prisma/client";
import { toPublicFoundReport, type PublicFoundReport } from "../reports/mappers";

export type ClaimMatchSummary = {
  id: string;
  score: number;
  status: Match["status"];
  lostReportId: string;
  foundReportId: string;
};

export type ClaimResponse = {
  id: string;
  status: Claim["status"];
  message: string | null;
  /** Claimant's own submitted evidence — never staff/found hidden answers. */
  evidence: string | null;
  proofRef: string | null;
  claimantId: string;
  foundReportId: string | null;
  matchId: string | null;
  createdAt: string;
  updatedAt: string;
  foundReport: PublicFoundReport | null;
  match: ClaimMatchSummary | null;
};

type ClaimWithRelations = Claim & {
  foundReport: ItemReport | null;
  match: Match | null;
};

export function toClaimResponse(claim: ClaimWithRelations): ClaimResponse {
  return {
    id: claim.id,
    status: claim.status,
    message: claim.message,
    evidence: claim.evidence,
    proofRef: claim.proofRef,
    claimantId: claim.claimantId,
    foundReportId: claim.foundReportId,
    matchId: claim.matchId,
    createdAt: claim.createdAt.toISOString(),
    updatedAt: claim.updatedAt.toISOString(),
    // Always public-safe found data for claim responses in TASK-009.
    // Claimants must not retrieve hidden found-item verification answers.
    foundReport: claim.foundReport ? toPublicFoundReport(claim.foundReport) : null,
    match: claim.match
      ? {
          id: claim.match.id,
          score: claim.match.score,
          status: claim.match.status,
          lostReportId: claim.match.lostReportId,
          foundReportId: claim.match.foundReportId,
        }
      : null,
  };
}
