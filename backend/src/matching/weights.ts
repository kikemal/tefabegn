/** Configurable weighted signals for matching v1. Scores are prioritization aids only. */
export const MATCH_SIGNAL_WEIGHTS = {
  category: 0.25,
  location: 0.2,
  dateProximity: 0.15,
  title: 0.2,
  description: 0.1,
  identifier: 0.1,
} as const;

/** Minimum total score required to persist a suggestion. */
export const MATCH_SCORE_THRESHOLD = 0.35;

export type MatchSignalName = keyof typeof MATCH_SIGNAL_WEIGHTS;
