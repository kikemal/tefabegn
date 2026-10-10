import type { ItemReport } from "@prisma/client";
import { notifyUsers } from "./service";
import { NotificationType } from "./types";

/** Public-safe report label — never includes private evidence fields. */
function publicReportLabel(report: Pick<ItemReport, "title" | "category" | "shareRef">): string {
  const ref = report.shareRef ? ` (${report.shareRef})` : "";
  return `${report.category}: ${report.title}${ref}`;
}

export async function notifyPossibleMatch(input: {
  matchId: string;
  lostReport: Pick<ItemReport, "id" | "title" | "category" | "shareRef" | "reporterId">;
  foundReport: Pick<ItemReport, "id" | "title" | "category" | "shareRef" | "reporterId">;
  score: number;
}): Promise<void> {
  await notifyUsers([input.lostReport.reporterId, input.foundReport.reporterId], {
    type: NotificationType.POSSIBLE_MATCH,
    title: "Possible match suggested",
    body: `A possible match was suggested involving ${publicReportLabel(input.lostReport)} and ${publicReportLabel(input.foundReport)}.`,
    metadata: {
      matchId: input.matchId,
      lostReportId: input.lostReport.id,
      foundReportId: input.foundReport.id,
      score: input.score,
      suggestionOnly: true,
    },
  });
}

export async function notifyClaimSubmitted(input: {
  claimId: string;
  claimantId: string;
  foundReport: Pick<ItemReport, "id" | "title" | "category" | "shareRef" | "reporterId">;
  lostReporterId?: string | null;
}): Promise<void> {
  await notifyUsers([input.foundReport.reporterId, input.lostReporterId], {
    type: NotificationType.CLAIM_SUBMITTED,
    title: "New claim submitted",
    body: `A claim was submitted for ${publicReportLabel(input.foundReport)}.`,
    metadata: {
      claimId: input.claimId,
      foundReportId: input.foundReport.id,
      // Intentionally omit claimant identity details beyond id for workflow linkage.
      claimantId: input.claimantId,
    },
  });
}

export async function notifyMoreInfoRequested(input: {
  claimId: string;
  claimantId: string;
  foundReport: Pick<ItemReport, "id" | "title" | "category" | "shareRef">;
}): Promise<void> {
  await notifyUsers([input.claimantId], {
    type: NotificationType.MORE_INFO_REQUESTED,
    title: "More information requested",
    body: `Staff requested more information for your claim on ${publicReportLabel(input.foundReport)}.`,
    metadata: {
      claimId: input.claimId,
      foundReportId: input.foundReport.id,
    },
  });
}

export async function notifyClaimApproved(input: {
  claimId: string;
  claimantId: string;
  foundReport: Pick<ItemReport, "id" | "title" | "category" | "shareRef" | "reporterId">;
  lostReporterId?: string | null;
}): Promise<void> {
  await notifyUsers([input.claimantId, input.foundReport.reporterId, input.lostReporterId], {
    type: NotificationType.CLAIM_APPROVED,
    title: "Claim approved",
    body: `A claim for ${publicReportLabel(input.foundReport)} was approved.`,
    metadata: {
      claimId: input.claimId,
      foundReportId: input.foundReport.id,
    },
  });
}

export async function notifyClaimRejected(input: {
  claimId: string;
  claimantId: string;
  foundReport: Pick<ItemReport, "id" | "title" | "category" | "shareRef">;
}): Promise<void> {
  await notifyUsers([input.claimantId], {
    type: NotificationType.CLAIM_REJECTED,
    title: "Claim rejected",
    body: `Your claim for ${publicReportLabel(input.foundReport)} was rejected.`,
    metadata: {
      claimId: input.claimId,
      foundReportId: input.foundReport.id,
    },
  });
}

export async function notifyHandoverReady(input: {
  claimId: string;
  claimantId: string;
  foundReport: Pick<ItemReport, "id" | "title" | "category" | "shareRef">;
}): Promise<void> {
  await notifyUsers([input.claimantId], {
    type: NotificationType.HANDOVER_READY,
    title: "Item ready for handover",
    body: `${publicReportLabel(input.foundReport)} is ready for handover at the campus lost & found desk.`,
    metadata: {
      claimId: input.claimId,
      foundReportId: input.foundReport.id,
    },
  });
}

export async function notifyItemReturned(input: {
  claimId: string;
  claimantId: string;
  foundReport: Pick<ItemReport, "id" | "title" | "category" | "shareRef" | "reporterId">;
  lostReporterId?: string | null;
  returnedAt: string;
}): Promise<void> {
  await notifyUsers([input.claimantId, input.foundReport.reporterId, input.lostReporterId], {
    type: NotificationType.ITEM_RETURNED,
    title: "Item returned",
    body: `${publicReportLabel(input.foundReport)} was recorded as returned.`,
    metadata: {
      claimId: input.claimId,
      foundReportId: input.foundReport.id,
      returnedAt: input.returnedAt,
    },
  });
}

export async function notifyCaseClosed(input: {
  claimId: string;
  claimantId: string;
  foundReport: Pick<ItemReport, "id" | "title" | "category" | "shareRef" | "reporterId">;
  lostReporterId?: string | null;
}): Promise<void> {
  await notifyUsers([input.claimantId, input.foundReport.reporterId, input.lostReporterId], {
    type: NotificationType.CASE_CLOSED,
    title: "Case closed",
    body: `The case for ${publicReportLabel(input.foundReport)} is now closed.`,
    metadata: {
      claimId: input.claimId,
      foundReportId: input.foundReport.id,
    },
  });
}
