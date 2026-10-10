import { apiRequest } from "./client";
import type { Claim } from "./claims";
import type { PublicReport } from "./reports";

export type PrivateFoundEvidence = {
  description: string;
  privateDetails: string | null;
  identifier: string | null;
  imageRef: string | null;
};

export type ClaimantEvidence = {
  message: string | null;
  evidence: string | null;
  proofRef: string | null;
};

export type VerificationPackage = {
  claimId: string;
  claimStatus: string;
  claimantId: string;
  publicFound: PublicReport;
  privateFoundEvidence: PrivateFoundEvidence;
  claimantEvidence: ClaimantEvidence;
  autoApproval: false;
  note: string;
};

export type StaffClaimReview = {
  claim: Claim;
  verification: VerificationPackage;
};

export type VerificationAssessment = "CONSISTENT" | "INCONSISTENT" | "UNCLEAR";
export type StaffDecision = "APPROVE" | "REJECT" | "REQUEST_MORE_INFO";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export function listStaffClaims(accessToken: string) {
  return apiRequest<{ claims: Claim[] }>("/staff/claims", {
    headers: authHeaders(accessToken),
  });
}

export function getStaffClaimReview(accessToken: string, claimId: string) {
  return apiRequest<StaffClaimReview>(`/staff/claims/${claimId}`, {
    headers: authHeaders(accessToken),
  });
}

export function recordVerificationAttempt(
  accessToken: string,
  claimId: string,
  body: {
    assessment: VerificationAssessment;
    notes: string;
    requestMoreInfo?: boolean;
  },
) {
  return apiRequest<{
    verification: VerificationPackage;
    attempt: {
      assessment: VerificationAssessment;
      notes: string;
      requestMoreInfo: boolean;
      resultingStatus: string;
      autoApproved: false;
    };
  }>(`/verification/claims/${claimId}/attempts`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
}

export function decideStaffClaim(
  accessToken: string,
  claimId: string,
  body: { decision: StaffDecision; notes: string },
) {
  return apiRequest<{ claim: Claim; decision: StaffDecision }>(
    `/staff/claims/${claimId}/decision`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(body),
    },
  );
}

export function markReadyForHandover(
  accessToken: string,
  foundReportId: string,
  body: { notes?: string } = {},
) {
  return apiRequest<{ report: PublicReport; claimId: string }>(
    `/staff/reports/found/${foundReportId}/ready-for-handover`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(body),
    },
  );
}

export function confirmStaffReturn(
  accessToken: string,
  foundReportId: string,
  body: { notes?: string; returnedAt?: string } = {},
) {
  return apiRequest<{ report: PublicReport }>(
    `/staff/reports/found/${foundReportId}/confirm-return`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(body),
    },
  );
}

export function closeStaffCase(
  accessToken: string,
  foundReportId: string,
  body: { notes?: string } = {},
) {
  return apiRequest<{ report: PublicReport }>(
    `/staff/reports/found/${foundReportId}/close-case`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(body),
    },
  );
}
