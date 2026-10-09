import type { ItemReport } from "@prisma/client";
import { reportStatusLabel } from "../workflow";

export type PublicLostReport = {
  id: string;
  type: "LOST";
  status: ItemReport["status"];
  statusLabel: string;
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

/** Public-safe found item — excludes private verification fields and private image. */
export type PublicFoundReport = {
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
  reporterId: string;
  createdAt: string;
  updatedAt: string;
};

/** Finder/staff view — includes private verification evidence. */
export type PrivateFoundReport = PublicFoundReport & {
  description: string;
  identifier: string | null;
  privateDetails: string | null;
  imageRef: string | null;
};

export function toPublicLostReport(report: ItemReport): PublicLostReport {
  return {
    id: report.id,
    type: "LOST",
    status: report.status,
    statusLabel: reportStatusLabel(report.status),
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

export function toPublicFoundReport(report: ItemReport): PublicFoundReport {
  return {
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
    reporterId: report.reporterId,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function toOwnerFoundReport(report: ItemReport): PrivateFoundReport {
  return {
    ...toPublicFoundReport(report),
    description: report.description,
    identifier: report.identifier,
    privateDetails: report.privateDetails,
    imageRef: report.imageRef,
  };
}
