/** Known case/audit event types used across the workflow. */
export const CaseEventType = {
  LOST_REPORTED: "LOST_REPORTED",
  LOST_UPDATED: "LOST_UPDATED",
  LOST_CANCELLED: "LOST_CANCELLED",
  LOST_CLOSED: "LOST_CLOSED",
  FOUND_REPORTED: "FOUND_REPORTED",
  FOUND_UPDATED: "FOUND_UPDATED",
  FOUND_CANCELLED: "FOUND_CANCELLED",
  FOUND_CLOSED: "FOUND_CLOSED",
  MATCH_SUGGESTED: "MATCH_SUGGESTED",
  CLAIM_SUBMITTED: "CLAIM_SUBMITTED",
  CLAIM_WITHDRAWN: "CLAIM_WITHDRAWN",
  VERIFICATION_RECORDED: "VERIFICATION_RECORDED",
  CLAIM_MORE_INFO_REQUESTED: "CLAIM_MORE_INFO_REQUESTED",
  CLAIM_APPROVED: "CLAIM_APPROVED",
  CLAIM_REJECTED: "CLAIM_REJECTED",
  HANDOVER_READY: "HANDOVER_READY",
  HANDOVER_COMPLETED: "HANDOVER_COMPLETED",
  RETURN_CONFIRMED: "RETURN_CONFIRMED",
  CASE_CLOSED: "CASE_CLOSED",
} as const;

export type CaseEventTypeName = (typeof CaseEventType)[keyof typeof CaseEventType];

export const CASE_EVENT_LABELS: Record<string, string> = {
  LOST_REPORTED: "Lost item reported",
  LOST_UPDATED: "Lost report updated",
  LOST_CANCELLED: "Lost report cancelled",
  LOST_CLOSED: "Lost report closed",
  FOUND_REPORTED: "Found item reported",
  FOUND_UPDATED: "Found report updated",
  FOUND_CANCELLED: "Found report cancelled",
  FOUND_CLOSED: "Found report closed",
  MATCH_SUGGESTED: "Possible match suggested",
  CLAIM_SUBMITTED: "Claim submitted",
  CLAIM_WITHDRAWN: "Claim withdrawn",
  VERIFICATION_RECORDED: "Ownership verification recorded",
  CLAIM_MORE_INFO_REQUESTED: "More information requested",
  CLAIM_APPROVED: "Claim approved",
  CLAIM_REJECTED: "Claim rejected",
  HANDOVER_READY: "Ready for handover",
  HANDOVER_COMPLETED: "Handover completed / item returned",
  RETURN_CONFIRMED: "Recipient confirmed receipt",
  CASE_CLOSED: "Case closed",
};

/** Keys that must never appear in CaseEvent.metadata. */
export const PRIVATE_METADATA_KEYS = new Set([
  "privateDetails",
  "evidence",
  "identifier",
  "password",
  "passwordHash",
  "proofRef",
  "imageRef",
]);
