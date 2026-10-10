import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "../../api/notifications";
import { useAuth } from "../../auth/AuthContext";
import { useLocale } from "../../i18n/context";

type Filter = "all" | "unread";

export function NotificationsPage() {
  const { t, locale } = useLocale();
  const { accessToken } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) {
      setError(t.dash.notifications.error);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listNotifications(accessToken, {
        unreadOnly: filter === "unread",
        limit: 50,
      });
      setItems(result.notifications);
    } catch {
      setError(t.dash.notifications.error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter, t.dash.notifications.error]);

  useEffect(() => {
    void load();
  }, [load]);

  function formatWhen(iso: string) {
    return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  async function onMarkRead(id: string) {
    if (!accessToken || markingId) return;
    setMarkingId(id);
    setActionError(null);
    try {
      const result = await markNotificationRead(accessToken, id);
      setItems((prev) =>
        filter === "unread"
          ? prev.filter((n) => n.id !== id)
          : prev.map((n) => (n.id === id ? result.notification : n)),
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : t.dash.notifications.markError,
      );
    } finally {
      setMarkingId(null);
    }
  }

  async function onMarkAll() {
    if (!accessToken || markingAll) return;
    setMarkingAll(true);
    setActionError(null);
    try {
      await markAllNotificationsRead(accessToken);
      if (filter === "unread") {
        setItems([]);
      } else {
        const now = new Date().toISOString();
        setItems((prev) =>
          prev.map((n) => (n.readAt ? n : { ...n, readAt: now })),
        );
      }
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : t.dash.notifications.markAllError,
      );
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadVisible = items.some((n) => !n.readAt);

  return (
    <div className="dash-page">
      <header className="dash-page__header">
        <h1>{t.dash.notifications.title}</h1>
        <p>{t.dash.notifications.subtitle}</p>
      </header>

      <div className="dash-notif-toolbar">
        <div className="dash-tabs" role="tablist" aria-label={t.dash.notifications.filterLabel}>
          <button
            type="button"
            className={filter === "all" ? "is-active" : undefined}
            aria-selected={filter === "all"}
            onClick={() => setFilter("all")}
          >
            {t.dash.notifications.filterAll}
          </button>
          <button
            type="button"
            className={filter === "unread" ? "is-active" : undefined}
            aria-selected={filter === "unread"}
            onClick={() => setFilter("unread")}
          >
            {t.dash.notifications.filterUnread}
          </button>
        </div>
        <div className="dash-notif-toolbar__actions">
          <button
            type="button"
            className="dash-btn dash-btn--ghost"
            onClick={() => void load()}
            disabled={loading}
          >
            {t.dash.notifications.retry}
          </button>
          {unreadVisible ? (
            <button
              type="button"
              className="dash-btn"
              onClick={() => void onMarkAll()}
              disabled={markingAll || loading}
            >
              {markingAll
                ? t.dash.notifications.markingAll
                : t.dash.notifications.markAll}
            </button>
          ) : null}
        </div>
      </div>

      {loading ? <p className="dash-loading">{t.dash.notifications.loading}</p> : null}
      {error ? (
        <div className="dash-card">
          <p className="dash-error">{error}</p>
          <button type="button" className="dash-btn" onClick={() => void load()}>
            {t.dash.notifications.retry}
          </button>
        </div>
      ) : null}
      {actionError ? <p className="dash-error">{actionError}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <p className="dash-empty">{t.dash.notifications.empty}</p>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ul className="dash-notif-list" aria-label={t.dash.notifications.title}>
          {items.map((n) => {
            const unread = !n.readAt;
            return (
              <li
                key={n.id}
                className={`dash-notif-item${unread ? " is-unread" : ""}`}
              >
                <div className="dash-notif-item__body">
                  <div className="dash-notif-item__head">
                    <h2>{n.title}</h2>
                    {unread ? (
                      <span className="dash-notif-item__badge">
                        {t.dash.notifications.unread}
                      </span>
                    ) : (
                      <span className="dash-notif-item__badge is-read">
                        {t.dash.notifications.read}
                      </span>
                    )}
                  </div>
                  <p>{n.body}</p>
                  <p className="dash-field__hint">{formatWhen(n.createdAt)}</p>
                </div>
                {unread ? (
                  <button
                    type="button"
                    className="dash-btn dash-btn--ghost"
                    disabled={markingId === n.id}
                    onClick={() => void onMarkRead(n.id)}
                  >
                    {markingId === n.id
                      ? t.dash.notifications.marking
                      : t.dash.notifications.markRead}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
