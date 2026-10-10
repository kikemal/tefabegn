import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { createClaim, listMyClaims, type Claim } from "../../api/claims";
import { generateMatches, listMatches, type MatchSuggestion } from "../../api/matches";
import { getReportById, type PublicReport, type ReportType } from "../../api/reports";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/dashboard/StatusBadge";
import { useLocale } from "../../i18n/context";

/** Only render public-safe found fields — never privateDetails / identifier. */
function publicFoundSummary(report: PublicReport) {
  return {
    id: report.id,
    title: report.title,
    category: report.category,
    location: report.location,
    description: report.publicDescription || report.description || "—",
    status: report.status,
    statusLabel: report.statusLabel,
  };
}

export function ItemDetailPage() {
  const { t, locale } = useLocale();
  const { accessToken, user } = useAuth();
  const { type = "lost", id = "" } = useParams();
  const reportType = (type.toUpperCase() === "FOUND" ? "FOUND" : "LOST") as ReportType;

  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [matches, setMatches] = useState<MatchSuggestion[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [claimMatchId, setClaimMatchId] = useState<string | null>(null);
  const [claimFoundId, setClaimFoundId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [evidence, setEvidence] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ message?: string; evidence?: string }>({});
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);

  const isOwner = Boolean(user && report && report.reporterId === user.id);
  const canGenerateMatches = isOwner;
  const canClaimFoundDirectly = reportType === "FOUND" && report && !isOwner;

  const formatDate = useCallback(
    (iso: string | null | undefined) => {
      if (!iso) return "—";
      return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(iso));
    },
    [locale],
  );

  const loadMatches = useCallback(async () => {
    if (!accessToken || !id) return;
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const query =
        reportType === "LOST" ? { lostReportId: id } : { foundReportId: id };
      const result = await listMatches(accessToken, query);
      setMatches(result.matches);
    } catch {
      setMatchesError(t.dash.matches.error);
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }, [accessToken, id, reportType, t.dash.matches.error]);

  const loadRelatedClaims = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await listMyClaims(accessToken);
      const related = result.claims.filter((c) => {
        if (reportType === "FOUND") {
          return c.foundReportId === id;
        }
        return c.match?.lostReportId === id;
      });
      setMyClaims(related);
    } catch {
      setMyClaims([]);
    }
  }, [accessToken, id, reportType]);

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

  useEffect(() => {
    if (!report || !accessToken) return;
    void loadMatches();
    void loadRelatedClaims();
  }, [report, accessToken, loadMatches, loadRelatedClaims]);

  async function onGenerate() {
    if (!accessToken || !id || generating) return;
    setGenerating(true);
    setMatchesError(null);
    try {
      const body =
        reportType === "LOST" ? { lostReportId: id, limit: 20 } : { foundReportId: id, limit: 20 };
      const result = await generateMatches(accessToken, body);
      setMatches(result.matches);
    } catch {
      setMatchesError(t.dash.matches.error);
    } finally {
      setGenerating(false);
    }
  }

  function openClaimForm(matchId: string | null, foundReportId: string) {
    setClaimMatchId(matchId);
    setClaimFoundId(foundReportId);
    setMessage("");
    setEvidence("");
    setFieldErrors({});
    setClaimError(null);
    setClaimSuccess(null);
  }

  function closeClaimForm() {
    setClaimMatchId(null);
    setClaimFoundId(null);
    setMessage("");
    setEvidence("");
    setFieldErrors({});
    setClaimError(null);
  }

  async function onSubmitClaim(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !claimFoundId || submittingClaim) return;

    const next: { message?: string; evidence?: string } = {};
    if (!message.trim()) next.message = t.dash.claims.required;
    if (!evidence.trim()) next.evidence = t.dash.claims.required;
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmittingClaim(true);
    setClaimError(null);
    setClaimSuccess(null);
    try {
      await createClaim(accessToken, {
        foundReportId: claimFoundId,
        matchId: claimMatchId || undefined,
        message: message.trim(),
        evidence: evidence.trim(),
      });
      setClaimSuccess(t.dash.claims.success);
      closeClaimForm();
      await loadRelatedClaims();
      await loadMatches();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "DUPLICATE_CLAIM") {
          setClaimError(t.dash.claims.duplicate);
        } else if (err.status === 403) {
          setClaimError(t.dash.claims.forbidden);
        } else {
          setClaimError(err.message || t.dash.claims.error);
        }
      } else {
        setClaimError(t.dash.claims.error);
      }
    } finally {
      setSubmittingClaim(false);
    }
  }

  const claimFormOpen = Boolean(claimFoundId);

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
        <>
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

          {(canGenerateMatches || matches.length > 0 || matchesLoading || matchesError) && (
            <section className="dash-card" style={{ marginTop: "1.25rem" }}>
              <div className="dash-section-head">
                <h2>{t.dash.matches.title}</h2>
                {canGenerateMatches ? (
                  <button
                    type="button"
                    className="dash-btn"
                    disabled={generating}
                    onClick={() => void onGenerate()}
                  >
                    {generating ? t.dash.matches.generating : t.dash.matches.generate}
                  </button>
                ) : null}
              </div>
              <p className="dash-note">{t.dash.matches.subtitle}</p>
              <p className="dash-field__hint">{t.dash.matches.suggestionNote}</p>

              {matchesLoading ? <p className="dash-loading">{t.dash.matches.loading}</p> : null}
              {matchesError ? <p className="dash-error">{matchesError}</p> : null}
              {!matchesLoading && !matchesError && matches.length === 0 ? (
                <p className="dash-empty">{t.dash.matches.empty}</p>
              ) : null}

              {matches.length > 0 ? (
                <ul className="dash-match-list">
                  {matches.map((match) => {
                    const counterpart =
                      reportType === "LOST" ? match.foundReport : match.lostReport;
                    const foundForClaim = match.foundReport;
                    const summary = publicFoundSummary(foundForClaim);
                    const alreadyClaimed = myClaims.some(
                      (c) =>
                        c.matchId === match.id ||
                        c.foundReportId === foundForClaim.id,
                    );
                    return (
                      <li key={match.id} className="dash-match-item">
                        <div className="dash-match-item__main">
                          <p className="dash-match-item__title">
                            {t.dash.matches.counterpart}: {counterpart.title}
                          </p>
                          <p className="dash-field__hint">
                            {counterpart.location} ·{" "}
                            {t.dash.categories[
                              counterpart.category as keyof typeof t.dash.categories
                            ] || counterpart.category}
                          </p>
                          <p className="dash-field__hint">
                            {summary.description}
                          </p>
                          <div className="dash-match-item__meta">
                            <span>
                              {t.dash.matches.score}: {Math.round(match.score * 100) / 100}
                            </span>
                            <StatusBadge status={match.status} label={match.statusLabel} />
                          </div>
                        </div>
                        {reportType === "LOST" && isOwner && !alreadyClaimed ? (
                          <button
                            type="button"
                            className="dash-btn dash-btn--ghost"
                            onClick={() => openClaimForm(match.id, foundForClaim.id)}
                          >
                            {t.dash.matches.claimThis}
                          </button>
                        ) : null}
                        {alreadyClaimed ? (
                          <StatusBadge
                            status="CLAIM_PENDING"
                            label={t.dash.status.CLAIM_PENDING}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          )}

          {canClaimFoundDirectly ? (
            <section className="dash-card" style={{ marginTop: "1.25rem" }}>
              <div className="dash-section-head">
                <h2>{t.dash.claims.title}</h2>
                {!claimFormOpen ? (
                  <button
                    type="button"
                    className="dash-btn"
                    onClick={() => openClaimForm(null, report.id)}
                  >
                    {t.dash.matches.claimThis}
                  </button>
                ) : null}
              </div>
              <p className="dash-note">{t.dash.claims.subtitle}</p>
            </section>
          ) : null}

          {claimFormOpen ? (
            <section className="dash-card" style={{ marginTop: "1.25rem" }}>
              <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{t.dash.claims.title}</h2>
              <p className="dash-note">{t.dash.claims.subtitle}</p>
              <form className="dash-field-grid" onSubmit={(e) => void onSubmitClaim(e)}>
                <div className="dash-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="claim-message">{t.dash.claims.message}</label>
                  <p className="dash-field__hint">{t.dash.claims.messageHint}</p>
                  <textarea
                    id="claim-message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                  />
                  {fieldErrors.message ? (
                    <p className="dash-field__error">{fieldErrors.message}</p>
                  ) : null}
                </div>
                <div className="dash-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="claim-evidence">{t.dash.claims.evidence}</label>
                  <p className="dash-field__hint">{t.dash.claims.evidenceHint}</p>
                  <textarea
                    id="claim-evidence"
                    rows={4}
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    maxLength={4000}
                  />
                  {fieldErrors.evidence ? (
                    <p className="dash-field__error">{fieldErrors.evidence}</p>
                  ) : null}
                </div>
                {claimError ? <p className="dash-error">{claimError}</p> : null}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button type="submit" className="dash-btn" disabled={submittingClaim}>
                    {submittingClaim ? t.dash.claims.submitting : t.dash.claims.submit}
                  </button>
                  <button
                    type="button"
                    className="dash-btn dash-btn--ghost"
                    disabled={submittingClaim}
                    onClick={closeClaimForm}
                  >
                    {t.dash.detail.back}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {claimSuccess ? <p className="dash-note">{claimSuccess}</p> : null}

          {myClaims.length > 0 ? (
            <section className="dash-card" style={{ marginTop: "1.25rem" }}>
              <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{t.dash.claims.myClaimsTitle}</h2>
              <ul className="dash-match-list">
                {myClaims.map((claim) => (
                  <li key={claim.id} className="dash-match-item">
                    <div className="dash-match-item__main">
                      <p className="dash-match-item__title">
                        {claim.foundReport?.title || t.dash.claims.relatedFound}
                      </p>
                      <StatusBadge status={claim.status} label={claim.statusLabel} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
