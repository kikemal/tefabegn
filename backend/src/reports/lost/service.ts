import { randomBytes } from "node:crypto";
import { ReportStatus, ReportType, Role, type ItemReport } from "@prisma/client";
import { recordCaseEvent } from "../../audit/service";
import { CaseEventType } from "../../audit/types";
import { AppError } from "../../middleware/errorHandler";
import { prisma } from "../../db/prisma";
import type { AuthenticatedUser } from "../../types/auth";
import {
  OWNER_CANCELLABLE_REPORT_STATUSES,
  OWNER_CLOSEABLE_REPORT_STATUSES,
  OWNER_EDITABLE_REPORT_STATUSES,
  assertReportTransition,
} from "../../workflow";
import {
  toOwnerLostReport,
  toPublicLostReport,
  type PrivateLostReport,
  type PublicLostReport,
} from "../mappers";
import type { CreateLostReportInput, UpdateLostReportInput } from "./validation";

function createShareRef(): string {
  return `LF-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function findLostReportOrThrow(id: string): Promise<ItemReport> {
  const report = await prisma.itemReport.findUnique({ where: { id } });
  if (!report || report.type !== ReportType.LOST) {
    throw new AppError(404, "REPORT_NOT_FOUND", "Lost report not found");
  }
  return report;
}

function assertOwner(report: ItemReport, userId: string): void {
  if (report.reporterId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You are not allowed to manage this report");
  }
}

function assertEditable(report: ItemReport): void {
  if (!OWNER_EDITABLE_REPORT_STATUSES.includes(report.status)) {
    throw new AppError(409, "INVALID_STATUS", "This report can no longer be edited");
  }
}

export async function createLostReport(
  user: AuthenticatedUser,
  input: CreateLostReportInput,
): Promise<PrivateLostReport> {
  const report = await prisma.itemReport.create({
    data: {
      type: ReportType.LOST,
      status: ReportStatus.ACTIVE,
      category: input.category,
      title: input.title,
      description: input.description,
      location: input.location,
      eventOccurredAt: input.lostAt,
      identifier: input.identifier,
      privateDetails: input.privateDetails,
      imageRef: input.imageRef,
      shareRef: createShareRef(),
      reporterId: user.id,
    },
  });

  await recordCaseEvent({
    reportId: report.id,
    actorId: user.id,
    eventType: CaseEventType.LOST_REPORTED,
    metadata: {
      category: report.category,
      status: report.status,
    },
  });

  return toOwnerLostReport(report);
}

export async function listMyLostReports(userId: string): Promise<PrivateLostReport[]> {
  const reports = await prisma.itemReport.findMany({
    where: { type: ReportType.LOST, reporterId: userId },
    orderBy: { createdAt: "desc" },
  });
  return reports.map(toOwnerLostReport);
}

export async function listLostReportsForStaff(): Promise<PrivateLostReport[]> {
  const reports = await prisma.itemReport.findMany({
    where: { type: ReportType.LOST },
    orderBy: { createdAt: "desc" },
  });
  return reports.map(toOwnerLostReport);
}

export async function getLostReportForViewer(
  viewer: AuthenticatedUser,
  reportId: string,
): Promise<PublicLostReport | PrivateLostReport> {
  const report = await findLostReportOrThrow(reportId);
  const canSeePrivate = viewer.id === report.reporterId || viewer.role === Role.STAFF;
  return canSeePrivate ? toOwnerLostReport(report) : toPublicLostReport(report);
}

export async function updateLostReport(
  user: AuthenticatedUser,
  reportId: string,
  input: UpdateLostReportInput,
): Promise<PrivateLostReport> {
  const report = await findLostReportOrThrow(reportId);
  assertOwner(report, user.id);
  assertEditable(report);

  const updated = await prisma.itemReport.update({
    where: { id: reportId },
    data: {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.lostAt !== undefined ? { eventOccurredAt: input.lostAt } : {}),
      ...(input.identifier !== undefined ? { identifier: input.identifier } : {}),
      ...(input.privateDetails !== undefined ? { privateDetails: input.privateDetails } : {}),
      ...(input.imageRef !== undefined ? { imageRef: input.imageRef } : {}),
    },
  });

  await recordCaseEvent({
    reportId,
    actorId: user.id,
    eventType: CaseEventType.LOST_UPDATED,
  });
  return toOwnerLostReport(updated);
}

export async function cancelLostReport(
  user: AuthenticatedUser,
  reportId: string,
): Promise<PrivateLostReport> {
  const report = await findLostReportOrThrow(reportId);
  assertOwner(report, user.id);

  if (report.status === ReportStatus.CANCELLED) {
    return toOwnerLostReport(report);
  }
  if (!OWNER_CANCELLABLE_REPORT_STATUSES.includes(report.status)) {
    throw new AppError(409, "INVALID_STATUS", "This report cannot be cancelled");
  }

  assertReportTransition(report.status, ReportStatus.CANCELLED);

  const updated = await prisma.itemReport.update({
    where: { id: reportId },
    data: { status: ReportStatus.CANCELLED },
  });
  await recordCaseEvent({
    reportId,
    actorId: user.id,
    eventType: CaseEventType.LOST_CANCELLED,
  });
  return toOwnerLostReport(updated);
}

export async function closeLostReport(
  user: AuthenticatedUser,
  reportId: string,
): Promise<PrivateLostReport> {
  const report = await findLostReportOrThrow(reportId);
  assertOwner(report, user.id);

  if (report.status === ReportStatus.CLOSED) {
    return toOwnerLostReport(report);
  }
  if (!OWNER_CLOSEABLE_REPORT_STATUSES.includes(report.status)) {
    throw new AppError(409, "INVALID_STATUS", "This report cannot be closed");
  }

  assertReportTransition(report.status, ReportStatus.CLOSED);

  const updated = await prisma.itemReport.update({
    where: { id: reportId },
    data: { status: ReportStatus.CLOSED },
  });
  await recordCaseEvent({
    reportId,
    actorId: user.id,
    eventType: CaseEventType.LOST_CLOSED,
  });
  return toOwnerLostReport(updated);
}
