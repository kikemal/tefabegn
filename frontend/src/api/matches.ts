import { apiRequest } from "./client";
import type { PublicReport } from "./reports";

export type MatchSuggestion = {
  id: string;
  score: number;
  status: string;
  statusLabel: string;
  reasons?: unknown;
  createdAt: string;
  updatedAt: string;
  suggestionOnly: true;
  lostReport: PublicReport;
  foundReport: PublicReport;
};

export type GenerateMatchesResult = {
  suggestionOnly: true;
  threshold: number;
  matches: MatchSuggestion[];
};

export type ListMatchesResult = {
  matches: MatchSuggestion[];
  suggestionOnly: true;
};

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export function generateMatches(
  accessToken: string,
  input: { lostReportId?: string; foundReportId?: string; limit?: number },
) {
  return apiRequest<GenerateMatchesResult>("/matches/generate", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function listMatches(
  accessToken: string,
  query: { lostReportId?: string; foundReportId?: string } = {},
) {
  const params = new URLSearchParams();
  if (query.lostReportId) params.set("lostReportId", query.lostReportId);
  if (query.foundReportId) params.set("foundReportId", query.foundReportId);
  const qs = params.toString();
  return apiRequest<ListMatchesResult>(`/matches${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(accessToken),
  });
}

export function getMatchById(accessToken: string, id: string) {
  return apiRequest<{ match: MatchSuggestion }>(`/matches/${id}`, {
    headers: authHeaders(accessToken),
  });
}
