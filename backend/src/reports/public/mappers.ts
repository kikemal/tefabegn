import type { ItemReport } from "@prisma/client";
import { reportStatusLabel } from "../../workflow";

/**
 * Explicit allowlist for anonymous welcome/public feed.
 * Never include privateDetails, identifier, description, imageRef,
 * reporterId, emails, evidence, returnedAt, or updatedAt.
 */
export type PublicRecentFoundReport = {
  id: string;
  type: "FOUND";
  status: ItemReport["status"];
  statusLabel: string;
  category: string;
  title: string;
  publicDescription: string | null;
  location: string;
  foundAt: string | null;
  shareRef: string | null;
  createdAt: string;
};

const ALLOWED_KEYS = [
  "id",
  "type",
  "status",
  "statusLabel",
  "category",
  "title",
  "publicDescription",
  "location",
  "foundAt",
  "shareRef",
  "createdAt",
] as const;

export function toPublicRecentFoundReport(report: ItemReport): PublicRecentFoundReport {
  const mapped: PublicRecentFoundReport = {
    id: report.id,
    type: "FOUND",
    status: report.status,
    statusLabel: reportStatusLabel(report.status),
    category: report.category,
    title: report.title,
    publicDescription: report.publicDescription,
    location: report.location,
    foundAt: report.eventOccurredAt ? report.eventOccurredAt.toISOString() : null,
    shareRef: report.shareRef,
    createdAt: report.createdAt.toISOString(),
  };

  // Defensive: only allowlisted keys leave this function.
  const allowlisted = {} as PublicRecentFoundReport;
  for (const key of ALLOWED_KEYS) {
    allowlisted[key] = mapped[key] as never;
  }
  return allowlisted;
}

export const PUBLIC_RECENT_FOUND_ALLOWED_KEYS: readonly string[] = [...ALLOWED_KEYS];
