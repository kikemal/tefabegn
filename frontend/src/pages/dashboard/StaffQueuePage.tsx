import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../../api/claims";
import { listStaffClaims } from "../../api/staff";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/dashboard/StatusBadge";
import { useLocale } from "../../i18n/context";

const ACTIVE_QUEUE = new Set([
  "SUBMITTED",
  "NEEDS_MORE_INFO",
  "UNDER_REVIEW",
  "APPROVED",
]);

export function StaffQueuePage() {
  const { t, locale } = useLocale();
  const { accessToken } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const load = useCallback(async () => {
    if (!accessToken) {
      setError(t.dash.staff.error);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listStaffClaims(accessToken);
      setClaims(result.claims);
    } catch {
      setError(t.dash.staff.error);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.dash.staff.error]);

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

  const visible =
    filter === "all" ? claims : claims.filter((c) => ACTIVE_QUEUE.has(c.status));

  return (
    <div className="dash-page">
      <header className="dash-page__header">
        <h1>{t.dash.staff.queueTitle}</h1>
        <p>{t.dash.staff.queueSubtitle}</p>
      </header>

      <div className="dash-notif-toolbar">
        <div className="dash-tabs" role="tablist">
          <button
            type="button"
            className={filter === "active" ? "is-active" : undefined}
            aria-selected={filter === "active"}
            onClick={() => setFilter("active")}
          >
            {t.dash.staff.filterActive}
          </button>
          <button
            type="button"
            className={filter === "all" ? "is-active" : undefined}
            aria-selected={filter === "all"}
            onClick={() => setFilter("all")}
          >
            {t.dash.staff.filterAll}
          </button>
        </div>
        <button
          type="button"
          className="dash-btn dash-btn--ghost"
          onClick={() => void load()}
          disabled={loading}
        >
          {t.dash.staff.retry}
        </button>
      </div>

      {loading ? <p className="dash-loading">{t.dash.staff.loading}</p> : null}
      {error ? (
        <div className="dash-card">
          <p className="dash-error">{error}</p>
          <button type="button" className="dash-btn" onClick={() => void load()}>
            {t.dash.staff.retry}
          </button>
        </div>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <p className="dash-empty">{t.dash.staff.empty}</p>
      ) : null}

      {!loading && !error && visible.length > 0 ? (
        <ul className="dash-match-list">
          {visible.map((claim) => (
            <li key={claim.id} className="dash-match-item">
              <div className="dash-match-item__main">
                <p className="dash-match-item__title">
                  {claim.foundReport?.title || t.dash.staff.claimFallback}
                </p>
                <p className="dash-field__hint">
                  {formatWhen(claim.createdAt)} · {claim.foundReport?.location || "—"}
                </p>
                <StatusBadge status={claim.status} label={claim.statusLabel} />
              </div>
              <Link className="dash-btn dash-btn--ghost" to={`/staff/claims/${claim.id}`}>
                {t.dash.staff.review}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
