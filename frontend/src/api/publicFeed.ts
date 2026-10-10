import { apiRequest } from "./client";

/**
 * Allowlisted public recent-found report (anonymous welcome feed).
 * Never expect privateDetails, identifier, description, imageRef, or reporterId.
 */
export type PublicRecentFoundReport = {
  id: string;
  type: "FOUND";
  status: string;
  statusLabel: string;
  category: string;
  title: string;
  publicDescription: string | null;
  location: string;
  foundAt: string | null;
  shareRef: string | null;
  createdAt: string;
};

export type RecentFoundFeed = {
  reports: PublicRecentFoundReport[];
};

/**
 * Anonymous GET /reports/public/recent-found — no session token required.
 */
export function fetchRecentPublicFound(limit = 8) {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiRequest<RecentFoundFeed>(`/reports/public/recent-found?${params}`, undefined, {
    skipAuthRefresh: true,
  });
}

export type ImageTone = "phone" | "bag" | "keys" | "card" | "other";

export function categoryImageTone(category: string): ImageTone {
  switch (category) {
    case "electronics":
      return "phone";
    case "bags":
      return "bag";
    case "keys":
      return "keys";
    case "cards":
    case "documents":
      return "card";
    default:
      return "other";
  }
}
