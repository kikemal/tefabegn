import type { ItemReport } from "@prisma/client";

export type PublicLostReport = {
  id: string;
  type: "LOST";
  status: ItemReport["status"];
  category: string;
  title: string;
  description: string;
  location: string;
  lostAt: string | null;
  shareRef: string | null;
  imageRef: string | null;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
};

export type PrivateLostReport = PublicLostReport & {
  identifier: string | null;
  privateDetails: string | null;
};

export function toPublicLostReport(report: ItemReport): PublicLostReport {
  return {
    id: report.id,
    type: "LOST",
    status: report.status,
    category: report.category,
    title: report.title,
    description: report.description,
    location: report.location,
    lostAt: report.eventOccurredAt ? report.eventOccurredAt.toISOString() : null,
    shareRef: report.shareRef,
    imageRef: report.imageRef,
    reporterId: report.reporterId,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function toOwnerLostReport(report: ItemReport): PrivateLostReport {
  return {
    ...toPublicLostReport(report),
    identifier: report.identifier,
    privateDetails: report.privateDetails,
  };
}
