import { apiRequest } from "./client";
import type { PublicReport } from "./reports";

export type ClaimMatchSummary = {
  id: string;
  score: number;
  status: string;
  statusLabel: string;
  lostReportId: string;
  foundReportId: string;
};

/** Claim payload — foundReport is public-safe only (no privateDetails/identifier). */
export type Claim = {
  id: string;
  status: string;
  statusLabel: string;
  message: string | null;
  evidence: string | null;
  proofRef: string | null;
  claimantId: string;
  foundReportId: string | null;
  matchId: string | null;
  recipientConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  foundReport: PublicReport | null;
  match: ClaimMatchSummary | null;
};

export type CreateClaimInput = {
  foundReportId?: string;
  matchId?: string;
  message: string;
  evidence: string;
  proofRef?: string;
};

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export function createClaim(accessToken: string, body: CreateClaimInput) {
  return apiRequest<{ claim: Claim; conflictingActiveClaims: Claim[] }>("/claims", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
}

export function listMyClaims(accessToken: string) {
  return apiRequest<{ claims: Claim[] }>("/claims/mine", {
    headers: authHeaders(accessToken),
  });
}

export function getClaimById(accessToken: string, id: string) {
  return apiRequest<{ claim: Claim }>(`/claims/${id}`, {
    headers: authHeaders(accessToken),
  });
}

export function withdrawClaim(accessToken: string, id: string) {
  return apiRequest<{ claim: Claim }>(`/claims/${id}/withdraw`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}
