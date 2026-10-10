import { apiRequest } from "./client";

export const REPORT_CATEGORIES = [
  "electronics",
  "bags",
  "documents",
  "clothing",
  "keys",
  "cards",
  "jewelry",
  "other",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReportType = "LOST" | "FOUND";

export type PublicReport = {
  id: string;
  type: ReportType;
  status: string;
  statusLabel: string;
  category: string;
  title: string;
  description?: string;
  publicDescription?: string;
  location: string;
  lostAt?: string | null;
  foundAt?: string | null;
  shareRef?: string;
  imageRef?: string | null;
  returnedAt?: string | null;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
};

export type PrivateLostReport = PublicReport & {
  type: "LOST";
  identifier?: string | null;
  privateDetails?: string | null;
};

export type PrivateFoundReport = PublicReport & {
  type: "FOUND";
  description?: string;
  identifier?: string | null;
  privateDetails?: string | null;
  imageRef?: string | null;
};

export type SearchResult = {
  reports: PublicReport[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export function listMyLostReports(accessToken: string) {
  return apiRequest<{ reports: PrivateLostReport[] }>("/reports/lost/mine", {
    headers: authHeaders(accessToken),
  });
}

export function listMyFoundReports(accessToken: string) {
  return apiRequest<{ reports: PrivateFoundReport[] }>("/reports/found/mine", {
    headers: authHeaders(accessToken),
  });
}

export function getReportById(accessToken: string, type: ReportType, id: string) {
  const path = type === "LOST" ? `/reports/lost/${id}` : `/reports/found/${id}`;
  return apiRequest<{ report: PublicReport }>(path, {
    headers: authHeaders(accessToken),
  });
}

export type SearchParams = {
  q?: string;
  type?: ReportType | "";
  category?: string;
  location?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export function searchReports(accessToken: string, params: SearchParams) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.type) query.set("type", params.type);
  if (params.category) query.set("category", params.category);
  if (params.location) query.set("location", params.location);
  if (params.status) query.set("status", params.status);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 20));
  return apiRequest<SearchResult>(`/reports/search?${query.toString()}`, {
    headers: authHeaders(accessToken),
  });
}

export type CreateLostInput = {
  category: ReportCategory;
  title: string;
  description: string;
  location: string;
  lostAt: string;
  identifier?: string;
  privateDetails?: string;
  imageRef?: string;
};

export type CreateFoundInput = {
  category: ReportCategory;
  title: string;
  description: string;
  publicDescription: string;
  location: string;
  foundAt: string;
  identifier?: string;
  privateDetails?: string;
  imageRef?: string;
};

export function createLostReport(accessToken: string, body: CreateLostInput) {
  return apiRequest<{ report: PrivateLostReport }>("/reports/lost", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
}

export function createFoundReport(accessToken: string, body: CreateFoundInput) {
  return apiRequest<{ report: PrivateFoundReport }>("/reports/found", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
}

export function listMyMatches(accessToken: string) {
  return apiRequest<{ matches: Array<{ id: string; status: string }> }>("/matches", {
    headers: authHeaders(accessToken),
  });
}
