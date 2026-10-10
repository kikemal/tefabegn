import { apiRequest } from "./client";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  metadata: unknown;
  createdAt: string;
};

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export function listNotifications(
  accessToken: string,
  query: { unreadOnly?: boolean; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (query.unreadOnly === true) params.set("unreadOnly", "true");
  if (query.unreadOnly === false) params.set("unreadOnly", "false");
  if (query.limit != null) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiRequest<{ notifications: NotificationItem[] }>(
    `/notifications${qs ? `?${qs}` : ""}`,
    { headers: authHeaders(accessToken) },
  );
}

export function getUnreadNotificationCount(accessToken: string) {
  return apiRequest<{ unreadCount: number }>("/notifications/unread-count", {
    headers: authHeaders(accessToken),
  });
}

export function markNotificationRead(accessToken: string, id: string) {
  return apiRequest<{ notification: NotificationItem }>(`/notifications/${id}/read`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function markAllNotificationsRead(accessToken: string) {
  return apiRequest<{ updated: number }>("/notifications/read-all", {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}
