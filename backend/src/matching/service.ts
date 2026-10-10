import {
  MatchStatus,
  ReportStatus,
  ReportType,
  Role,
  type ItemReport,
  type Match,
  type Prisma,
} from "@prisma/client";
import { recordCaseEvent } from "../audit/service";
import { CaseEventType } from "../audit/types";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../db/prisma";
import {
  toOwnerFoundReport,
  toOwnerLostReport,
  toPublicFoundReport,
  toPublicLostReport,
} from "../reports/mappers";
import type { AuthenticatedUser } from "../types/auth";
import { notifyPossibleMatch } from "../notifications/emit";
import { MATCHABLE_REPORT_STATUSES, assertReportTransition, matchStatusLabel } from "../workflow";
import { scoreLostFoundPair } from "./scoring";
import type { GenerateMatchesInput, ListMatchesQuery } from "./validation";
import { MATCH_SCORE_THRESHOLD } from "./weights";

type MatchWithReports = Match & {
  lostReport: ItemReport;
  foundReport: ItemReport;
};

function canViewMatch(viewer: AuthenticatedUser, match: MatchWithReports): boolean {
  if (viewer.role === Role.STAFF) {
    return true;
  }
  return viewer.id === match.lostReport.reporterId || viewer.id === match.foundReport.reporterId;
}

function toMatchResponse(viewer: AuthenticatedUser, match: MatchWithReports) {
  const lostIsOwner = viewer.role === Role.STAFF || viewer.id === match.lostReport.reporterId;
  const foundIsOwner = viewer.role === Role.STAFF || viewer.id === match.foundReport.reporterId;

  return {
    id: match.id,
    score: match.score,
    status: match.status,
    statusLabel: matchStatusLabel(match.status),
    reasons: match.reasons,
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
    // Suggestion only — never an ownership/approval decision.
    suggestionOnly: true as const,
    lostReport: lostIsOwner
      ? toOwnerLostReport(match.lostReport)
      : toPublicLostReport(match.lostReport),
    foundReport: foundIsOwner
      ? toOwnerFoundReport(match.foundReport)
      : toPublicFoundReport(match.foundReport),
  };
}

async function markPossibleMatch(report: ItemReport): Promise<void> {
  if (report.status !== ReportStatus.ACTIVE) {
    return;
  }
  assertReportTransition(report.status, ReportStatus.POSSIBLE_MATCH);
  await prisma.itemReport.update({
    where: { id: report.id },
    data: { status: ReportStatus.POSSIBLE_MATCH },
  });
}

async function loadLostOrThrow(id: string): Promise<ItemReport> {
  const report = await prisma.itemReport.findUnique({ where: { id } });
  if (!report || report.type !== ReportType.LOST) {
    throw new AppError(404, "REPORT_NOT_FOUND", "Lost report not found");
  }
  return report;
}

async function loadFoundOrThrow(id: string): Promise<ItemReport> {
  const report = await prisma.itemReport.findUnique({ where: { id } });
  if (!report || report.type !== ReportType.FOUND) {
    throw new AppError(404, "REPORT_NOT_FOUND", "Found report not found");
  }
  return report;
}

function assertCanGenerateForReport(user: AuthenticatedUser, report: ItemReport): void {
  if (user.role === Role.STAFF || user.id === report.reporterId) {
    return;
  }
  throw new AppError(403, "FORBIDDEN", "You are not allowed to generate matches for this report");
}

async function upsertSuggestion(
  actorId: string,
  lost: ItemReport,
  found: ItemReport,
): Promise<MatchWithReports | null> {
  const scored = scoreLostFoundPair(lost, found);
  if (scored.score < MATCH_SCORE_THRESHOLD) {
    return null;
  }

  const reasons: Prisma.InputJsonValue = {
    suggestionOnly: true,
    threshold: MATCH_SCORE_THRESHOLD,
    signals: scored.signals,
  };

  const existing = await prisma.match.findUnique({
    where: {
      lostReportId_foundReportId: {
        lostReportId: lost.id,
        foundReportId: found.id,
      },
    },
    include: {
      lostReport: true,
      foundReport: true,
    },
  });

  // Never rewind staff/terminal match decisions when regenerating suggestions.
  if (existing && existing.status !== MatchStatus.SUGGESTED) {
    return existing;
  }

  const match = await prisma.match.upsert({
    where: {
      lostReportId_foundReportId: {
        lostReportId: lost.id,
        foundReportId: found.id,
      },
    },
    create: {
      lostReportId: lost.id,
      foundReportId: found.id,
      score: scored.score,
      reasons,
      status: MatchStatus.SUGGESTED,
    },
    update: {
      score: scored.score,
      reasons,
    },
    include: {
      lostReport: true,
      foundReport: true,
    },
  });

  await markPossibleMatch(lost);
  await markPossibleMatch(found);

  await recordCaseEvent({
    reportId: lost.id,
    actorId,
    eventType: CaseEventType.MATCH_SUGGESTED,
    metadata: {
      matchId: match.id,
      foundReportId: found.id,
      score: scored.score,
    },
  });
  await recordCaseEvent({
    reportId: found.id,
    actorId,
    eventType: CaseEventType.MATCH_SUGGESTED,
    metadata: {
      matchId: match.id,
      lostReportId: lost.id,
      score: scored.score,
    },
  });

  // Notify only when a new suggestion is created (avoid spam on regenerate).
  if (!existing) {
    await notifyPossibleMatch({
      matchId: match.id,
      lostReport: lost,
      foundReport: found,
      score: scored.score,
    });
  }

  const refreshed = await prisma.match.findUnique({
    where: { id: match.id },
    include: { lostReport: true, foundReport: true },
  });
  return refreshed ?? match;
}

export async function generateMatches(user: AuthenticatedUser, input: GenerateMatchesInput) {
  const limit = input.limit;
  const created: MatchWithReports[] = [];

  if (input.lostReportId && input.foundReportId) {
    const lost = await loadLostOrThrow(input.lostReportId);
    const found = await loadFoundOrThrow(input.foundReportId);
    assertCanGenerateForReport(user, lost);
    assertCanGenerateForReport(user, found);

    const match = await upsertSuggestion(user.id, lost, found);
    return {
      suggestionOnly: true as const,
      threshold: MATCH_SCORE_THRESHOLD,
      matches: match ? [toMatchResponse(user, match)] : [],
    };
  }

  if (input.lostReportId) {
    const lost = await loadLostOrThrow(input.lostReportId);
    assertCanGenerateForReport(user, lost);

    const candidates = await prisma.itemReport.findMany({
      where: {
        type: ReportType.FOUND,
        status: { in: [...MATCHABLE_REPORT_STATUSES] },
        ...(lost.category ? { category: lost.category } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });

    const ranked = candidates
      .map((found) => ({ found, scored: scoreLostFoundPair(lost, found) }))
      .filter((entry) => entry.scored.score >= MATCH_SCORE_THRESHOLD)
      .sort((a, b) => b.scored.score - a.scored.score || b.found.id.localeCompare(a.found.id))
      .slice(0, limit);

    for (const entry of ranked) {
      const match = await upsertSuggestion(user.id, lost, entry.found);
      if (match) {
        created.push(match);
      }
    }
  } else if (input.foundReportId) {
    const found = await loadFoundOrThrow(input.foundReportId);
    assertCanGenerateForReport(user, found);

    const candidates = await prisma.itemReport.findMany({
      where: {
        type: ReportType.LOST,
        status: { in: [...MATCHABLE_REPORT_STATUSES] },
        ...(found.category ? { category: found.category } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });

    const ranked = candidates
      .map((lost) => ({ lost, scored: scoreLostFoundPair(lost, found) }))
      .filter((entry) => entry.scored.score >= MATCH_SCORE_THRESHOLD)
      .sort((a, b) => b.scored.score - a.scored.score || b.lost.id.localeCompare(a.lost.id))
      .slice(0, limit);

    for (const entry of ranked) {
      const match = await upsertSuggestion(user.id, entry.lost, found);
      if (match) {
        created.push(match);
      }
    }
  }

  created.sort((a, b) => b.score - a.score || b.id.localeCompare(a.id));

  return {
    suggestionOnly: true as const,
    threshold: MATCH_SCORE_THRESHOLD,
    matches: created.map((match) => toMatchResponse(user, match)),
  };
}

export async function listMatches(user: AuthenticatedUser, query: ListMatchesQuery) {
  const where: Prisma.MatchWhereInput = {};
  if (query.lostReportId) {
    where.lostReportId = query.lostReportId;
  }
  if (query.foundReportId) {
    where.foundReportId = query.foundReportId;
  }

  if (user.role !== Role.STAFF) {
    where.OR = [{ lostReport: { reporterId: user.id } }, { foundReport: { reporterId: user.id } }];
  }

  const matches = await prisma.match.findMany({
    where,
    include: { lostReport: true, foundReport: true },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 100,
  });

  return matches
    .filter((match) => canViewMatch(user, match))
    .map((match) => toMatchResponse(user, match));
}

export async function getMatchById(user: AuthenticatedUser, matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { lostReport: true, foundReport: true },
  });

  if (!match) {
    throw new AppError(404, "MATCH_NOT_FOUND", "Match not found");
  }
  if (!canViewMatch(user, match)) {
    throw new AppError(403, "FORBIDDEN", "You are not allowed to view this match");
  }

  return toMatchResponse(user, match);
}
