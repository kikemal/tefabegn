import type { Prisma } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../db/prisma";
import { toNotificationResponse } from "./mappers";
import type { NotificationTypeName } from "./types";
import type { ListNotificationsQuery } from "./validation";

export async function createNotification(input: {
  userId: string;
  type: NotificationTypeName;
  title: string;
  body: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      metadata: input.metadata,
    },
  });
}

/** Notify distinct recipients; skips empty/duplicate ids. */
export async function notifyUsers(
  userIds: Array<string | null | undefined>,
  input: {
    type: NotificationTypeName;
    title: string;
    body: string;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      metadata: input.metadata,
    })),
  });
}

export async function listMyNotifications(userId: string, query: ListNotificationsQuery) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit,
  });

  return notifications.map(toNotificationResponse);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== userId) {
    throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");
  }

  if (notification.readAt) {
    return toNotificationResponse(notification);
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
  return toNotificationResponse(updated);
}

export async function markAllNotificationsRead(userId: string): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}
