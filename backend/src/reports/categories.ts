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
