import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  REPORT_CATEGORIES,
  searchReports,
  type PublicReport,
  type ReportType,
} from "../../api/reports";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/dashboard/StatusBadge";
import { useLocale } from "../../i18n/context";

export function BrowseItemsPage() {
  const { t, locale } = useLocale();
  const { accessToken } = useAuth();
  const [params, setParams] = useSearchParams();

  const [type, setType] = useState<"" | ReportType>(
    (params.get("type") as ReportType | null) ?? "",
  );
  const [q, setQ] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [location, setLocation] = useState(params.get("location") ?? "");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const nextQ = params.get("q") ?? "";
    setQ(nextQ);
  }, [params]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!accessToken) {
        setError(t.dash.browse.error);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await searchReports(accessToken, {
          q: q.trim() || undefined,
          type: type || undefined,
          category: category || undefined,
          location: location.trim() || undefined,
          page,
          pageSize: 12,
        });
        if (cancelled) return;
        const sorted = [...result.reports].sort((a, b) =>
          sort === "newest"
            ? b.createdAt.localeCompare(a.createdAt)
            : a.createdAt.localeCompare(b.createdAt),
        );
        setReports(sorted);
        setTotalPages(Math.max(1, result.pagination.totalPages));
      } catch {
        if (cancelled) return;
        setError(t.dash.browse.error);
        setReports([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, q, type, category, location, page, sort, t.dash.browse.error]);

  const formatDate = useMemo(
    () => (iso: string) =>
      new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(iso)),
    [locale],
  );

  function applySearch() {
    const next = new URLSearchParams();
    if (q.trim()) next.set("q", q.trim());
    if (type) next.set("type", type);
    if (category) next.set("category", category);
    if (location.trim()) next.set("location", location.trim());
    setParams(next);
    setPage(1);
  }

  function clearFilters() {
    setQ("");
    setType("");
    setCategory("");
    setLocation("");
    setSort("newest");
    setParams({});
    setPage(1);
  }

  return (
    <div className="dash-page">
      <header className="dash-page__header">
        <h1>{t.dash.browse.title}</h1>
        <p>{t.dash.browse.subtitle}</p>
      </header>

      <section className="dash-card dash-filters">
        <div className="dash-tabs" role="tablist" aria-label={t.dash.browse.title}>
          {(
            [
              ["", t.dash.browse.all],
              ["LOST", t.dash.browse.lost],
              ["FOUND", t.dash.browse.found],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value || "all"}
              type="button"
              role="tab"
              className={type === value ? "is-active" : undefined}
              aria-selected={type === value}
              onClick={() => {
                setType(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="dash-field-grid dash-field-grid--2">
          <div className="dash-field">
            <label htmlFor="browse-q">{t.dash.browse.search}</label>
            <input
              id="browse-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.dash.topbar.searchPlaceholder}
            />
          </div>
          <div className="dash-field">
            <label htmlFor="browse-category">{t.dash.browse.category}</label>
            <select
              id="browse-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t.dash.browse.all}</option>
              {REPORT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.dash.categories[cat]}
                </option>
              ))}
            </select>
          </div>
          <div className="dash-field">
            <label htmlFor="browse-location">{t.dash.browse.location}</label>
            <input
              id="browse-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="dash-field">
            <label htmlFor="browse-sort">{t.dash.browse.sort}</label>
            <select
              id="browse-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            >
              <option value="newest">{t.dash.browse.sortNewest}</option>
              <option value="oldest">{t.dash.browse.sortOldest}</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="dash-btn" onClick={applySearch}>
            {t.dash.browse.search}
          </button>
          <button type="button" className="dash-btn dash-btn--ghost" onClick={clearFilters}>
            {t.dash.browse.clear}
          </button>
        </div>
      </section>

      {loading ? <p className="dash-loading">{t.dash.browse.loading}</p> : null}
      {error ? <p className="dash-error">{error}</p> : null}
      {!loading && !error && reports.length === 0 ? (
        <p className="dash-empty">{t.dash.browse.empty}</p>
      ) : null}

      <div className="dash-item-grid">
        {reports.map((report) => (
          <Link
            key={report.id}
            to={`/items/${report.type.toLowerCase()}/${report.id}`}
            className="dash-item-card"
          >
            <h3>{report.title}</h3>
            <p>
              {report.type === "LOST" ? t.dash.home.typeLost : t.dash.home.typeFound} ·{" "}
              {report.location}
            </p>
            <p>{formatDate(report.createdAt)}</p>
            <StatusBadge status={report.status} label={report.statusLabel} />
            <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>
              {t.dash.browse.viewDetails}
            </span>
          </Link>
        ))}
      </div>

      {totalPages > 1 ? (
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            className="dash-btn dash-btn--ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ←
          </button>
          <span>
            {t.dash.browse.page} {page} {t.dash.browse.of} {totalPages}
          </span>
          <button
            type="button"
            className="dash-btn dash-btn--ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}
