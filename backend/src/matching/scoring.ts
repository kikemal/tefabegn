import type { ItemReport } from "@prisma/client";
import { MATCH_SIGNAL_WEIGHTS, type MatchSignalName } from "./weights";

export type MatchSignalResult = {
  signal: MatchSignalName;
  weight: number;
  contribution: number;
  /** Safe explanation — never includes private evidence values. */
  reason: string;
};

export type MatchScoreResult = {
  score: number;
  signals: MatchSignalResult[];
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length > 1),
  );
}

function jaccardSimilarity(a: string, b: string): number {
  const left = tokenize(a);
  const right = tokenize(b);
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }

  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function scoreCategory(lost: ItemReport, found: ItemReport): MatchSignalResult {
  const weight = MATCH_SIGNAL_WEIGHTS.category;
  const matched = normalizeText(lost.category) === normalizeText(found.category);
  const contribution = matched ? weight : 0;
  return {
    signal: "category",
    weight,
    contribution,
    reason: matched ? "Exact category match" : "Category differs",
  };
}

function scoreLocation(lost: ItemReport, found: ItemReport): MatchSignalResult {
  const weight = MATCH_SIGNAL_WEIGHTS.location;
  const left = normalizeText(lost.location);
  const right = normalizeText(found.location);

  let ratio = 0;
  let reason = "Locations differ";
  if (left && right) {
    if (left === right) {
      ratio = 1;
      reason = "Exact location match";
    } else if (left.includes(right) || right.includes(left)) {
      ratio = 0.6;
      reason = "Partial location overlap";
    }
  }

  return {
    signal: "location",
    weight,
    contribution: weight * ratio,
    reason,
  };
}

function scoreDateProximity(lost: ItemReport, found: ItemReport): MatchSignalResult {
  const weight = MATCH_SIGNAL_WEIGHTS.dateProximity;
  if (!lost.eventOccurredAt || !found.eventOccurredAt) {
    return {
      signal: "dateProximity",
      weight,
      contribution: 0,
      reason: "Missing lost/found date for proximity scoring",
    };
  }

  const diffMs = Math.abs(lost.eventOccurredAt.getTime() - found.eventOccurredAt.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  let ratio = 0;
  let reason = `Dates are ${diffDays.toFixed(1)} days apart`;
  if (diffDays <= 1) {
    ratio = 1;
    reason = "Dates within 1 day";
  } else if (diffDays <= 3) {
    ratio = 0.7;
    reason = "Dates within 3 days";
  } else if (diffDays <= 7) {
    ratio = 0.4;
    reason = "Dates within 7 days";
  } else if (diffDays <= 14) {
    ratio = 0.2;
    reason = "Dates within 14 days";
  }

  return {
    signal: "dateProximity",
    weight,
    contribution: weight * ratio,
    reason,
  };
}

function scoreTitle(lost: ItemReport, found: ItemReport): MatchSignalResult {
  const weight = MATCH_SIGNAL_WEIGHTS.title;
  const ratio = jaccardSimilarity(lost.title, found.title);
  return {
    signal: "title",
    weight,
    contribution: weight * ratio,
    reason: ratio > 0 ? `Title similarity ${(ratio * 100).toFixed(0)}%` : "Titles do not overlap",
  };
}

function scoreDescription(lost: ItemReport, found: ItemReport): MatchSignalResult {
  const weight = MATCH_SIGNAL_WEIGHTS.description;
  // Found public text preferred for comparison; fall back to internal description server-side only.
  const foundText = [found.publicDescription, found.description].filter(Boolean).join(" ");
  const ratio = jaccardSimilarity(lost.description, foundText);
  return {
    signal: "description",
    weight,
    contribution: weight * ratio,
    reason:
      ratio > 0
        ? `Description similarity ${(ratio * 100).toFixed(0)}%`
        : "Descriptions do not overlap",
  };
}

function scoreIdentifier(lost: ItemReport, found: ItemReport): MatchSignalResult {
  const weight = MATCH_SIGNAL_WEIGHTS.identifier;
  const left = normalizeText(lost.identifier);
  const right = normalizeText(found.identifier);

  if (!left || !right) {
    return {
      signal: "identifier",
      weight,
      contribution: 0,
      reason: "Identifier not available on both reports",
    };
  }

  const matched = left === right;
  return {
    signal: "identifier",
    weight,
    contribution: matched ? weight : 0,
    reason: matched ? "Optional identifier exact match" : "Identifiers differ",
  };
}

/** Deterministic lost↔found score. Never used for auto-approval. */
export function scoreLostFoundPair(lost: ItemReport, found: ItemReport): MatchScoreResult {
  const signals = [
    scoreCategory(lost, found),
    scoreLocation(lost, found),
    scoreDateProximity(lost, found),
    scoreTitle(lost, found),
    scoreDescription(lost, found),
    scoreIdentifier(lost, found),
  ];

  const score = Number(signals.reduce((sum, signal) => sum + signal.contribution, 0).toFixed(4));
  return { score, signals };
}
