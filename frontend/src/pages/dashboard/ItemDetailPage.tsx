import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getReportById, type PublicReport, type ReportType } from "../../api/reports";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/dashboard/StatusBadge";
import { useLocale } from "../../i18n/context";

export function ItemDetailPage() {
  const { t, locale } = useLocale();
  const { accessToken } = useAuth();
  const { type = "lost", id = "" } = useParams();
  const reportType = (type.toUpperCase() === "FOUND" ? "FOUND" : "LOST") as ReportType;

  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken || !id) {
        setError(t.dash.detail.notFound);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await getReportById(accessToken, reportType, id);
        if (!cancelled) {
          setReport(result.report);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError(t.dash.detail.error);
          setReport(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, id, reportType, t.dash.detail.error, t.dash.detail.notFound]);

  function formatDate(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  }

  return (
    <div className="dash-page">
      <Link to="/browse" className="dash-btn dash-btn--ghost" style={{ width: "fit-content" }}>
        {t.dash.detail.back}
      </Link>

      <header className="dash-page__header">
        <h1>{t.dash.detail.title}</h1>
      </header>

      {loading ? <p className="dash-loading">{t.dash.detail.loading}</p> : null}
      {error ? <p className="dash-error">{error}</p> : null}

      {report ? (
        <article className="dash-card dash-field-grid dash-field-grid--2">
          <div>
            <p className="dash-field__hint">{t.dash.home.itemName}</p>
            <p style={{ margin: "0.2rem 0 0", fontWeight: 700, fontSize: "1.15rem" }}>
              {report.title}
            </p>
          </div>
          <div>
            <p className="dash-field__hint">{t.dash.home.status}</p>
            <div style={{ marginTop: "0.35rem" }}>
              <StatusBadge status={report.status} label={report.statusLabel} />
            </div>
          </div>
          <div>
            <p className="dash-field__hint">{t.dash.home.reportType}</p>
            <p style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>
              {report.type === "LOST" ? t.dash.home.typeLost : t.dash.home.typeFound}
            </p>
          </div>
          <div>
            <p className="dash-field__hint">{t.dash.browse.category}</p>
            <p style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>
              {t.dash.categories[report.category as keyof typeof t.dash.categories] ||
                report.category}
            </p>
          </div>
          <div>
            <p className="dash-field__hint">{t.dash.home.location}</p>
            <p style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>{report.location}</p>
          </div>
          <div>
            <p className="dash-field__hint">{t.dash.home.date}</p>
            <p style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>
              {formatDate(report.lostAt || report.foundAt || report.createdAt)}
            </p>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <p className="dash-field__hint">{t.dash.report.description}</p>
            <p style={{ margin: "0.35rem 0 0" }}>
              {report.publicDescription || report.description || "—"}
            </p>
          </div>
        </article>
      ) : null}
    </div>
  );
}
