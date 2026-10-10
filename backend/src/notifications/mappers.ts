import type { Notification } from "@prisma/client";

export type NotificationResponse = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  metadata: unknown;
  createdAt: string;
};

export function toNotificationResponse(notification: Notification): NotificationResponse {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    metadata: notification.metadata,
    createdAt: notification.createdAt.toISOString(),
  };
}
