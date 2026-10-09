import { ClaimStatus, MatchStatus, ReportStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { AppError } from "../src/middleware/errorHandler";
import {
  REPORT_STATUS_LABELS,
  assertClaimTransition,
  assertMatchTransition,
  assertReportTransition,
  canTransitionClaim,
  canTransitionMatch,
  canTransitionReport,
  claimStatusLabel,
  reportStatusLabel,
} from "../src/workflow";

describe("case status workflow", () => {
  it("exposes human-readable labels for every report status", () => {
    for (const status of Object.values(ReportStatus)) {
      expect(REPORT_STATUS_LABELS[status].length).toBeGreaterThan(0);
      expect(reportStatusLabel(status)).toBe(REPORT_STATUS_LABELS[status]);
    }
  });

  it("allows the core happy-path report transitions", () => {
    expect(canTransitionReport(ReportStatus.DRAFT, ReportStatus.ACTIVE)).toBe(true);
    expect(canTransitionReport(ReportStatus.ACTIVE, ReportStatus.POSSIBLE_MATCH)).toBe(true);
    expect(canTransitionReport(ReportStatus.POSSIBLE_MATCH, ReportStatus.CLAIM_PENDING)).toBe(true);
    expect(canTransitionReport(ReportStatus.CLAIM_PENDING, ReportStatus.UNDER_REVIEW)).toBe(true);
    expect(canTransitionReport(ReportStatus.UNDER_REVIEW, ReportStatus.APPROVED)).toBe(true);
    expect(canTransitionReport(ReportStatus.APPROVED, ReportStatus.HANDOVER_PENDING)).toBe(true);
    expect(canTransitionReport(ReportStatus.HANDOVER_PENDING, ReportStatus.RETURNED)).toBe(true);
    expect(canTransitionReport(ReportStatus.RETURNED, ReportStatus.CLOSED)).toBe(true);
  });

  it("rejects invalid report transitions", () => {
    expect(canTransitionReport(ReportStatus.CLOSED, ReportStatus.ACTIVE)).toBe(false);
    expect(canTransitionReport(ReportStatus.CANCELLED, ReportStatus.ACTIVE)).toBe(false);
    expect(canTransitionReport(ReportStatus.ACTIVE, ReportStatus.APPROVED)).toBe(false);
    expect(canTransitionReport(ReportStatus.DRAFT, ReportStatus.HANDOVER_PENDING)).toBe(false);

    expect(() => assertReportTransition(ReportStatus.CLOSED, ReportStatus.ACTIVE)).toThrow(
      AppError,
    );
    try {
      assertReportTransition(ReportStatus.APPROVED, ReportStatus.ACTIVE);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(409);
      expect((error as AppError).code).toBe("INVALID_STATUS");
      expect((error as AppError).message).toContain("Approved");
      expect((error as AppError).message).toContain("Active");
    }
  });

  it("allows claim workflow transitions and blocks terminal jumps", () => {
    expect(canTransitionClaim(ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW)).toBe(true);
    expect(canTransitionClaim(ClaimStatus.UNDER_REVIEW, ClaimStatus.APPROVED)).toBe(true);
    expect(canTransitionClaim(ClaimStatus.APPROVED, ClaimStatus.REJECTED)).toBe(false);
    expect(canTransitionClaim(ClaimStatus.REJECTED, ClaimStatus.SUBMITTED)).toBe(false);
    expect(() => assertClaimTransition(ClaimStatus.WITHDRAWN, ClaimStatus.APPROVED)).toThrow(
      AppError,
    );
    expect(claimStatusLabel(ClaimStatus.NEEDS_MORE_INFO)).toBe("Needs more information");
  });

  it("allows match suggestion transitions without skipping closure rules", () => {
    expect(canTransitionMatch(MatchStatus.SUGGESTED, MatchStatus.ACCEPTED_FOR_REVIEW)).toBe(true);
    expect(canTransitionMatch(MatchStatus.DISMISSED, MatchStatus.ACCEPTED_FOR_REVIEW)).toBe(false);
    expect(() => assertMatchTransition(MatchStatus.CLOSED, MatchStatus.SUGGESTED)).toThrow(
      AppError,
    );
  });
});
