import { randomBytes } from "node:crypto";
import { ReportStatus, ReportType, Role, type ItemReport, type Prisma } from "@prisma/client";
import { AppError } from "../../middleware/errorHandler";
import { prisma } from "../../db/prisma";
import type { AuthenticatedUser } from "../../types/auth";
import {
  toOwnerFoundReport,
  toPublicFoundReport,
  type PrivateFoundReport,
  type PublicFoundReport,
} from "../mappers";
import type { CreateFoundReportInput, UpdateFoundReportInput } from "./validation";

const OWNER_EDITABLE_STATUSES: ReportStatus[] = [ReportStatus.DRAFT, ReportStatus.ACTIVE];

function createShareRef(): string {
  return `FF-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function recordCaseEvent(
  reportId: string,
  actorId: string,
  eventType: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.caseEvent.create({
    data: {
      reportId,
      actorId,
      eventType,
      metadata,
    },
  });
}

async function findFoundReportOrThrow(id: string): Promise<ItemReport> {
  const report = await prisma.itemReport.findUnique({ where: { id } });
  if (!report || report.type !== ReportType.FOUND) {
    throw new AppError(404, "REPORT_NOT_FOUND", "Found report not found");
  }
  return report;
}

function assertOwner(report: ItemReport, userId: string): void {
  if (report.reporterId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You are not allowed to manage this report");
  }
}

function assertEditable(report: ItemReport): void {
  if (!OWNER_EDITABLE_STATUSES.includes(report.status)) {
    throw new AppError(409, "INVALID_STATUS", "This report can no longer be edited");
  }
}

export async function createFoundReport(
  user: AuthenticatedUser,
  input: CreateFoundReportInput,
): Promise<PrivateFoundReport> {
  const report = await prisma.itemReport.create({
    data: {
      type: ReportType.FOUND,
      status: ReportStatus.ACTIVE,
      category: input.category,
      title: input.title,
      description: input.description,
      location: input.location,
      eventOccurredAt: input.foundAt,
      publicDescription: input.publicDescription,
      identifier: input.identifier,
      privateDetails: input.privateDetails,
      imageRef: input.imageRef,
      shareRef: createShareRef(),
      reporterId: user.id,
    },
  });

  await recordCaseEvent(report.id, user.id, "FOUND_REPORTED", {
    category: report.category,
    status: report.status,
  });

  return toOwnerFoundReport(report);
}

export async function listMyFoundReports(userId: string): Promise<PrivateFoundReport[]> {
  const reports = await prisma.itemReport.findMany({
    where: { type: ReportType.FOUND, reporterId: userId },
    orderBy: { createdAt: "desc" },
  });
  return reports.map(toOwnerFoundReport);
}

export async function listFoundReportsForStaff(): Promise<PrivateFoundReport[]> {
  const reports = await prisma.itemReport.findMany({
    where: { type: ReportType.FOUND },
    orderBy: { createdAt: "desc" },
  });
  return reports.map(toOwnerFoundReport);
}

export async function getFoundReportForViewer(
  viewer: AuthenticatedUser,
  reportId: string,
): Promise<PublicFoundReport | PrivateFoundReport> {
  const report = await findFoundReportOrThrow(reportId);
  const canSeePrivate = viewer.id === report.reporterId || viewer.role === Role.STAFF;
  return canSeePrivate ? toOwnerFoundReport(report) : toPublicFoundReport(report);
}

export async function updateFoundReport(
  user: AuthenticatedUser,
  reportId: string,
  input: UpdateFoundReportInput,
): Promise<PrivateFoundReport> {
  const report = await findFoundReportOrThrow(reportId);
  assertOwner(report, user.id);
  assertEditable(report);

  const updated = await prisma.itemReport.update({
    where: { id: reportId },
    data: {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.foundAt !== undefined ? { eventOccurredAt: input.foundAt } : {}),
      ...(input.publicDescription !== undefined
        ? { publicDescription: input.publicDescription }
        : {}),
      ...(input.identifier !== undefined ? { identifier: input.identifier } : {}),
      ...(input.privateDetails !== undefined ? { privateDetails: input.privateDetails } : {}),
      ...(input.imageRef !== undefined ? { imageRef: input.imageRef } : {}),
    },
  });

  await recordCaseEvent(reportId, user.id, "FOUND_UPDATED");
  return toOwnerFoundReport(updated);
}

export async function cancelFoundReport(
  user: AuthenticatedUser,
  reportId: string,
): Promise<PrivateFoundReport> {
  const report = await findFoundReportOrThrow(reportId);
  assertOwner(report, user.id);

  if (report.status === ReportStatus.CANCELLED) {
    return toOwnerFoundReport(report);
  }
  if (!OWNER_EDITABLE_STATUSES.includes(report.status)) {
    throw new AppError(409, "INVALID_STATUS", "This report cannot be cancelled");
  }

  const updated = await prisma.itemReport.update({
    where: { id: reportId },
    data: { status: ReportStatus.CANCELLED },
  });
  await recordCaseEvent(reportId, user.id, "FOUND_CANCELLED");
  return toOwnerFoundReport(updated);
}

export async function closeFoundReport(
  user: AuthenticatedUser,
  reportId: string,
): Promise<PrivateFoundReport> {
  const report = await findFoundReportOrThrow(reportId);
  assertOwner(report, user.id);

  if (report.status === ReportStatus.CLOSED) {
    return toOwnerFoundReport(report);
  }
  if (report.status !== ReportStatus.ACTIVE && report.status !== ReportStatus.DRAFT) {
    throw new AppError(409, "INVALID_STATUS", "This report cannot be closed");
  }

  const updated = await prisma.itemReport.update({
    where: { id: reportId },
    data: { status: ReportStatus.CLOSED },
  });
  await recordCaseEvent(reportId, user.id, "FOUND_CLOSED");
  return toOwnerFoundReport(updated);
}
