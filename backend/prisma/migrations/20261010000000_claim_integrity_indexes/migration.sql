-- Enforce at most one active claim per claimant + found item.
CREATE UNIQUE INDEX "Claim_one_active_per_claimant_found"
ON "Claim" ("claimantId", "foundReportId")
WHERE "foundReportId" IS NOT NULL
  AND status IN ('SUBMITTED', 'NEEDS_MORE_INFO', 'UNDER_REVIEW');

-- Enforce at most one approved claim per found item.
CREATE UNIQUE INDEX "Claim_one_approved_per_found"
ON "Claim" ("foundReportId")
WHERE "foundReportId" IS NOT NULL
  AND status = 'APPROVED';
