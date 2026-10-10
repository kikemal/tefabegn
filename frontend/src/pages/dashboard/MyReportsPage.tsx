import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listMyClaims, withdrawClaim, type Claim } from "../../api/claims";
import {
  listMyFoundReports,
  listMyLostReports,
  type PrivateFoundReport,
  type PrivateLostReport,
} from "../../api/reports";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/dashboard/StatusBadge";
import { useLocale } from "../../i18n/context";

type Tab = "lost" | "found" | "claims";

const WITHDRAWABLE = new Set(["SUBMITTED", "NEEDS_MORE_INFO"]);

export function MyReportsPage() {
  const { t, locale } = useLocale();
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<Tab>("lost");
  const [lost, setLost] = useState<PrivateLostReport[]>([]);
  const [found, setFound] = useState<PrivateFoundReport[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimNote, setClaimNote] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

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
        const [lostRes, foundRes, claimsRes] = await Promise.all([
          listMyLostReports(accessToken),
          listMyFoundReports(accessToken),
          listMyClaims(accessToken),
        ]);
        if (cancelled) return;
        setLost(lostRes.reports);
        setFound(foundRes.reports);
        setClaims(claimsRes.claims);
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

  const rows = tab === "lost" ? lost : tab === "found" ? found : [];

  function formatDate(iso: string) {
    return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  }

  async function onWithdraw(claimId: string) {
    if (!accessToken || withdrawingId) return;
    setWithdrawingId(claimId);
    setClaimNote(null);
    try {
      const result = await withdrawClaim(accessToken, claimId);
      setClaims((prev) => prev.map((c) => (c.id === claimId ? result.claim : c)));
      setClaimNote(t.dash.claims.withdrawSuccess);
    } catch (err) {
      if (err instanceof ApiError) {
        setClaimNote(err.message || t.dash.claims.withdrawError);
      } else {
        setClaimNote(t.dash.claims.withdrawError);
      }
    } finally {
      setWithdrawingId(null);
    }
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
        <button
          type="button"
          className={tab === "claims" ? "is-active" : undefined}
          aria-selected={tab === "claims"}
          onClick={() => setTab("claims")}
        >
          {t.dash.claims.myClaimsTitle}
        </button>
      </div>

      {loading ? <p className="dash-loading">{t.dash.myReports.loading}</p> : null}
      {error ? <p className="dash-error">{error}</p> : null}
      {claimNote ? <p className="dash-note">{claimNote}</p> : null}

      {tab !== "claims" && !loading && !error && rows.length === 0 ? (
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

      {tab !== "claims" ? (
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
      ) : null}

      {tab === "claims" && !loading && !error ? (
        <section className="dash-card">
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{t.dash.claims.myClaimsTitle}</h2>
          <p className="dash-note">{t.dash.claims.myClaimsSubtitle}</p>
          {claims.length === 0 ? (
            <p className="dash-empty">{t.dash.claims.empty}</p>
          ) : (
            <ul className="dash-match-list">
              {claims.map((claim) => {
                const foundTitle = claim.foundReport?.title || t.dash.claims.relatedFound;
                const foundId = claim.foundReportId;
                const canWithdraw = WITHDRAWABLE.has(claim.status);
                return (
                  <li key={claim.id} className="dash-match-item">
                    <div className="dash-match-item__main">
                      <p className="dash-match-item__title">{foundTitle}</p>
                      <p className="dash-field__hint">
                        {t.dash.claims.claimStatus}: {claim.statusLabel}
                      </p>
                      <StatusBadge status={claim.status} label={claim.statusLabel} />
                      {foundId ? (
                        <Link to={`/items/found/${foundId}`}>{t.dash.myReports.viewDetails}</Link>
                      ) : null}
                    </div>
                    {canWithdraw ? (
                      <button
                        type="button"
                        className="dash-btn dash-btn--ghost"
                        disabled={withdrawingId === claim.id}
                        onClick={() => void onWithdraw(claim.id)}
                      >
                        {withdrawingId === claim.id
                          ? t.dash.claims.withdrawing
                          : t.dash.claims.withdraw}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
