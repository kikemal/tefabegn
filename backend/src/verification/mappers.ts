import type { Claim, ItemReport } from "@prisma/client";
import { toPublicFoundReport, type PublicFoundReport } from "../reports/mappers";

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
  claimStatus: Claim["status"];
  claimantId: string;
  /** Public-safe found item summary. */
  publicFound: PublicFoundReport;
  /** Secret identifying evidence for staff comparison only. */
  privateFoundEvidence: PrivateFoundEvidence;
  /** Evidence supplied by the claimant. */
  claimantEvidence: ClaimantEvidence;
  autoApproval: false;
  note: string;
};

export function toVerificationPackage(
  claim: Claim & { foundReport: ItemReport },
): VerificationPackage {
  return {
    claimId: claim.id,
    claimStatus: claim.status,
    claimantId: claim.claimantId,
    publicFound: toPublicFoundReport(claim.foundReport),
    privateFoundEvidence: {
      description: claim.foundReport.description,
      privateDetails: claim.foundReport.privateDetails,
      identifier: claim.foundReport.identifier,
      imageRef: claim.foundReport.imageRef,
    },
    claimantEvidence: {
      message: claim.message,
      evidence: claim.evidence,
      proofRef: claim.proofRef,
    },
    autoApproval: false,
    note: "Verification is staff-assisted only and does not automatically approve a claim.",
  };
}
