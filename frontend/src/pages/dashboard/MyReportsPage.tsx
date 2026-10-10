import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listMyFoundReports,
  listMyLostReports,
  type PrivateFoundReport,
  type PrivateLostReport,
} from "../../api/reports";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/dashboard/StatusBadge";
import { useLocale } from "../../i18n/context";

export function MyReportsPage() {
  const { t, locale } = useLocale();
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<"lost" | "found">("lost");
  const [lost, setLost] = useState<PrivateLostReport[]>([]);
  const [found, setFound] = useState<PrivateFoundReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) {
        setError(t.dash.myReports.error);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [lostRes, foundRes] = await Promise.all([
          listMyLostReports(accessToken),
          listMyFoundReports(accessToken),
        ]);
        if (cancelled) return;
        setLost(lostRes.reports);
        setFound(foundRes.reports);
        setError(null);
      } catch {
        if (!cancelled) setError(t.dash.myReports.error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, t.dash.myReports.error]);

  const rows = tab === "lost" ? lost : found;

  function formatDate(iso: string) {
    return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  }

  return (
    <div className="dash-page">
      <header className="dash-page__header">
        <h1>{t.dash.myReports.title}</h1>
        <p>{t.dash.myReports.subtitle}</p>
      </header>

      <div className="dash-tabs" role="tablist">
        <button
          type="button"
          className={tab === "lost" ? "is-active" : undefined}
          aria-selected={tab === "lost"}
          onClick={() => setTab("lost")}
        >
          {t.dash.myReports.lostTab}
        </button>
        <button
          type="button"
          className={tab === "found" ? "is-active" : undefined}
          aria-selected={tab === "found"}
          onClick={() => setTab("found")}
        >
          {t.dash.myReports.foundTab}
        </button>
      </div>

      {loading ? <p className="dash-loading">{t.dash.myReports.loading}</p> : null}
      {error ? <p className="dash-error">{error}</p> : null}

      {!loading && !error && rows.length === 0 ? (
        <div className="dash-card">
          <p className="dash-empty">
            {tab === "lost" ? t.dash.myReports.emptyLost : t.dash.myReports.emptyFound}
          </p>
          <Link
            to={tab === "lost" ? "/report?type=lost" : "/report?type=found"}
            className="dash-btn"
            style={{ marginTop: "0.75rem" }}
          >
            {tab === "lost" ? t.dash.myReports.reportLost : t.dash.myReports.reportFound}
          </Link>
        </div>
      ) : null}

      <div className="dash-item-grid">
        {rows.map((report) => (
          <article key={report.id} className="dash-item-card">
            <h3>{report.title}</h3>
            <p>{report.location}</p>
            <p>{formatDate(report.createdAt)}</p>
            <StatusBadge status={report.status} label={report.statusLabel} />
            <Link to={`/items/${report.type.toLowerCase()}/${report.id}`}>
              {t.dash.myReports.viewDetails}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
