import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Lightbulb,
  PackageSearch,
  Activity,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listMyFoundReports, listMyLostReports, type PublicReport } from "../../api/reports";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/dashboard/StatusBadge";
import { useLocale } from "../../i18n/context";

type ActivityRow = {
  id: string;
  title: string;
  type: "LOST" | "FOUND";
  date: string;
  location: string;
  status: string;
  statusLabel: string;
};

const ACTIVE = new Set([
  "ACTIVE",
  "POSSIBLE_MATCH",
  "CLAIM_PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "HANDOVER_PENDING",
]);
const IN_PROGRESS = new Set([
  "CLAIM_PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "HANDOVER_PENDING",
]);
const RETURNED = new Set(["RETURNED", "CLOSED"]);

function greetingKey(hour: number): "goodMorning" | "goodAfternoon" | "goodEvening" {
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

function firstName(fullName: string | undefined) {
  if (!fullName?.trim()) return null;
  return fullName.trim().split(/\s+/)[0] ?? null;
}

function summarize(reports: PublicReport[]) {
  return {
    activeReports: reports.filter((r) => ACTIVE.has(r.status)).length,
    possibleMatches: reports.filter((r) => r.status === "POSSIBLE_MATCH").length,
    inProgress: reports.filter((r) => IN_PROGRESS.has(r.status)).length,
    returned: reports.filter((r) => RETURNED.has(r.status)).length,
  };
}

export function DashboardHome() {
  const { t, locale } = useLocale();
  const { user, accessToken } = useAuth();
  const [loadError, setLoadError] = useState(false);
  const [stats, setStats] = useState({
    activeReports: 0,
    possibleMatches: 0,
    inProgress: 0,
    returned: 0,
  });
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const greet = t.dash.home[greetingKey(new Date().getHours())];
  const name = firstName(user?.fullName) ?? t.dash.home.greetingFallback;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!accessToken) {
        setLoadError(true);
        setStats({ activeReports: 0, possibleMatches: 0, inProgress: 0, returned: 0 });
        setActivity([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(false);
      try {
        const [lost, found] = await Promise.all([
          listMyLostReports(accessToken),
          listMyFoundReports(accessToken),
        ]);
        if (cancelled) return;

        const reports = [...lost.reports, ...found.reports];
        setStats(summarize(reports));
        const rows: ActivityRow[] = reports
          .slice()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 6)
          .map((r) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            date: (r.lostAt || r.foundAt || r.createdAt).slice(0, 10),
            location: r.location,
            status: r.status,
            statusLabel: r.statusLabel,
          }));
        setActivity(rows);
        setLoadError(false);
      } catch {
        if (cancelled) return;
        setLoadError(true);
        setStats({ activeReports: 0, possibleMatches: 0, inProgress: 0, returned: 0 });
        setActivity([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const formatDate = useMemo(
    () => (iso: string) =>
      new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(`${iso}T12:00:00`)),
    [locale],
  );

  return (
    <div className="dash-page">
      <header className="dash-page__header">
        <h1>
          {greet}, {name}
        </h1>
        <p>{t.dash.home.subtitle}</p>
      </header>

      <p className={`dash-note${loadError ? " dash-error" : ""}`}>
        {loading
          ? t.dash.browse.loading
          : loadError
            ? t.dash.home.statsErrorNote
            : t.dash.home.liveStatsNote}
      </p>

      <section className="dash-stat-grid" aria-label={t.dash.home.recentActivity}>
        <article className="dash-card dash-stat">
          <div className="dash-stat__top">
            <span className="dash-stat__label">{t.dash.home.activeReports}</span>
            <ClipboardList className="dash-stat__icon" size={18} aria-hidden="true" />
          </div>
          <div className="dash-stat__value">{stats.activeReports}</div>
        </article>
        <article className="dash-card dash-stat">
          <div className="dash-stat__top">
            <span className="dash-stat__label">{t.dash.home.possibleMatches}</span>
            <PackageSearch className="dash-stat__icon" size={18} aria-hidden="true" />
          </div>
          <div className="dash-stat__value">{stats.possibleMatches}</div>
        </article>
        <article className="dash-card dash-stat">
          <div className="dash-stat__top">
            <span className="dash-stat__label">{t.dash.home.inProgress}</span>
            <Activity className="dash-stat__icon" size={18} aria-hidden="true" />
          </div>
          <div className="dash-stat__value">{stats.inProgress}</div>
        </article>
        <article className="dash-card dash-stat">
          <div className="dash-stat__top">
            <span className="dash-stat__label">{t.dash.home.returned}</span>
            <CheckCircle2 className="dash-stat__icon" size={18} aria-hidden="true" />
          </div>
          <div className="dash-stat__value">{stats.returned}</div>
        </article>
      </section>

      <section className="dash-action-grid" aria-label={t.dash.nav.report}>
        <Link to="/report?type=lost" className="dash-action dash-action--accent">
          <Search size={22} strokeWidth={1.6} aria-hidden="true" />
          <span className="dash-action__title">{t.dash.home.reportLostTitle}</span>
          <span className="dash-action__desc">{t.dash.home.reportLostDesc}</span>
          <span className="dash-action__cta">
            {t.dash.home.reportLostCta}
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>
        <Link to="/report?type=found" className="dash-action">
          <PackageSearch size={22} strokeWidth={1.6} aria-hidden="true" />
          <span className="dash-action__title">{t.dash.home.reportFoundTitle}</span>
          <span className="dash-action__desc">{t.dash.home.reportFoundDesc}</span>
          <span className="dash-action__cta">
            {t.dash.home.reportFoundCta}
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>
      </section>

      <div className="dash-home-split">
        <section className="dash-card">
          <div className="dash-section-head">
            <h2>{t.dash.home.recentActivity}</h2>
            <Link to="/my-reports">{t.dash.home.viewAll}</Link>
          </div>
          {activity.length === 0 ? (
            <p className="dash-empty">{t.dash.home.emptyActivity}</p>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>{t.dash.home.itemName}</th>
                    <th>{t.dash.home.reportType}</th>
                    <th>{t.dash.home.date}</th>
                    <th>{t.dash.home.location}</th>
                    <th>{t.dash.home.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((row) => (
                    <tr key={`${row.type}-${row.id}`}>
                      <td>
                        <Link to={`/items/${row.type.toLowerCase()}/${row.id}`}>{row.title}</Link>
                      </td>
                      <td>
                        {row.type === "LOST" ? t.dash.home.typeLost : t.dash.home.typeFound}
                      </td>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.location}</td>
                      <td>
                        <StatusBadge status={row.status} label={row.statusLabel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="dash-card dash-tips">
          <div className="dash-section-head">
            <h2>{t.dash.home.tipsTitle}</h2>
          </div>
          <ul>
            <li>
              <Lightbulb size={16} aria-hidden="true" />
              <span>{t.dash.home.tip1}</span>
            </li>
            <li>
              <Lightbulb size={16} aria-hidden="true" />
              <span>{t.dash.home.tip2}</span>
            </li>
            <li>
              <Lightbulb size={16} aria-hidden="true" />
              <span>{t.dash.home.tip3}</span>
            </li>
            <li>
              <Lightbulb size={16} aria-hidden="true" />
              <span>{t.dash.home.tip4}</span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
