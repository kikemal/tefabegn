import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  closeStaffCase,
  confirmStaffReturn,
  decideStaffClaim,
  getStaffClaimReview,
  markReadyForHandover,
  recordVerificationAttempt,
  type StaffClaimReview,
  type StaffDecision,
  type VerificationAssessment,
} from "../../api/staff";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/dashboard/StatusBadge";
import { useLocale } from "../../i18n/context";

const DECIDABLE = new Set(["SUBMITTED", "NEEDS_MORE_INFO", "UNDER_REVIEW"]);
const VERIFIABLE = new Set(["SUBMITTED", "NEEDS_MORE_INFO", "UNDER_REVIEW"]);

export function StaffClaimPage() {
  const { claimId = "" } = useParams();
  const { t } = useLocale();
  const { accessToken } = useAuth();

  const [review, setReview] = useState<StaffClaimReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [assessment, setAssessment] = useState<VerificationAssessment>("CONSISTENT");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [requestMoreInfo, setRequestMoreInfo] = useState(false);

  const [decision, setDecision] = useState<StaffDecision>("APPROVE");
  const [decisionNotes, setDecisionNotes] = useState("");

  const [handoverNotes, setHandoverNotes] = useState("");

  const load = useCallback(async () => {
    if (!accessToken || !claimId) {
      setError(t.dash.staff.notFound);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getStaffClaimReview(accessToken, claimId);
      setReview(result);
    } catch (err) {
      setReview(null);
      if (err instanceof ApiError && err.status === 404) {
        setError(t.dash.staff.notFound);
      } else if (err instanceof ApiError && err.status === 403) {
        setError(t.dash.staff.forbidden);
      } else {
        setError(t.dash.staff.error);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, claimId, t.dash.staff.error, t.dash.staff.forbidden, t.dash.staff.notFound]);

  useEffect(() => {
    void load();
  }, [load]);

  function mapActionError(err: unknown, fallback: string) {
    if (err instanceof ApiError) {
      if (err.code === "INVALID_STATUS") return t.dash.staff.invalidStatus;
      if (err.code === "VALIDATION_ERROR") return err.message || t.dash.staff.validationError;
      if (err.status === 403) return t.dash.staff.forbidden;
      return err.message || fallback;
    }
    return fallback;
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !claimId || busy) return;
    if (!verifyNotes.trim()) {
      setActionError(t.dash.staff.notesRequired);
      return;
    }
    setBusy(true);
    setActionError(null);
    setFeedback(null);
    try {
      await recordVerificationAttempt(accessToken, claimId, {
        assessment,
        notes: verifyNotes.trim(),
        requestMoreInfo,
      });
      setFeedback(t.dash.staff.verifySuccess);
      setVerifyNotes("");
      setRequestMoreInfo(false);
      await load();
    } catch (err) {
      setActionError(mapActionError(err, t.dash.staff.verifyError));
    } finally {
      setBusy(false);
    }
  }

  async function onDecide(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !claimId || busy) return;
    if (!decisionNotes.trim()) {
      setActionError(t.dash.staff.notesRequired);
      return;
    }
    setBusy(true);
    setActionError(null);
    setFeedback(null);
    try {
      await decideStaffClaim(accessToken, claimId, {
        decision,
        notes: decisionNotes.trim(),
      });
      setFeedback(t.dash.staff.decisionSuccess);
      setDecisionNotes("");
      await load();
    } catch (err) {
      setActionError(mapActionError(err, t.dash.staff.decisionError));
    } finally {
      setBusy(false);
    }
  }

  async function onHandoverReady() {
    const foundId = review?.claim.foundReportId;
    if (!accessToken || !foundId || busy) return;
    setBusy(true);
    setActionError(null);
    setFeedback(null);
    try {
      await markReadyForHandover(accessToken, foundId, {
        notes: handoverNotes.trim() || undefined,
      });
      setFeedback(t.dash.staff.handoverSuccess);
      setHandoverNotes("");
      await load();
    } catch (err) {
      setActionError(mapActionError(err, t.dash.staff.handoverError));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmReturn() {
    const foundId = review?.claim.foundReportId;
    if (!accessToken || !foundId || busy) return;
    setBusy(true);
    setActionError(null);
    setFeedback(null);
    try {
      await confirmStaffReturn(accessToken, foundId, {
        notes: handoverNotes.trim() || undefined,
      });
      setFeedback(t.dash.staff.returnSuccess);
      setHandoverNotes("");
      await load();
    } catch (err) {
      setActionError(mapActionError(err, t.dash.staff.returnError));
    } finally {
      setBusy(false);
    }
  }

  async function onCloseCase() {
    const foundId = review?.claim.foundReportId;
    if (!accessToken || !foundId || busy) return;
    setBusy(true);
    setActionError(null);
    setFeedback(null);
    try {
      await closeStaffCase(accessToken, foundId, {
        notes: handoverNotes.trim() || undefined,
      });
      setFeedback(t.dash.staff.closeSuccess);
      setHandoverNotes("");
      await load();
    } catch (err) {
      setActionError(mapActionError(err, t.dash.staff.closeError));
    } finally {
      setBusy(false);
    }
  }

  const claim = review?.claim;
  const verification = review?.verification;
  const foundStatus = claim?.foundReport?.status;
  const canVerify = claim && VERIFIABLE.has(claim.status);
  const canDecide = claim && DECIDABLE.has(claim.status);
  const canHandover = foundStatus === "APPROVED" && claim?.status === "APPROVED";
  const canReturn = foundStatus === "HANDOVER_PENDING";
  const canClose = foundStatus === "RETURNED";

  return (
    <div className="dash-page">
      <Link to="/staff" className="dash-btn dash-btn--ghost" style={{ width: "fit-content" }}>
        {t.dash.staff.backQueue}
      </Link>

      <header className="dash-page__header">
        <h1>{t.dash.staff.reviewTitle}</h1>
        <p>{t.dash.staff.reviewSubtitle}</p>
      </header>

      {loading ? <p className="dash-loading">{t.dash.staff.loading}</p> : null}
      {error ? <p className="dash-error">{error}</p> : null}
      {feedback ? <p className="dash-note">{feedback}</p> : null}
      {actionError ? <p className="dash-error">{actionError}</p> : null}

      {claim && verification ? (
        <>
          <section className="dash-card dash-field-grid dash-field-grid--2">
            <div>
              <p className="dash-field__hint">{t.dash.staff.claimStatus}</p>
              <div style={{ marginTop: "0.35rem" }}>
                <StatusBadge status={claim.status} label={claim.statusLabel} />
              </div>
            </div>
            <div>
              <p className="dash-field__hint">{t.dash.staff.foundStatus}</p>
              <div style={{ marginTop: "0.35rem" }}>
                {claim.foundReport ? (
                  <StatusBadge
                    status={claim.foundReport.status}
                    label={claim.foundReport.statusLabel}
                  />
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="dash-field__hint">{t.dash.staff.publicFound}</p>
              <p style={{ margin: "0.35rem 0 0", fontWeight: 700 }}>
                {verification.publicFound.title}
              </p>
              <p className="dash-field__hint">
                {verification.publicFound.location} ·{" "}
                {verification.publicFound.publicDescription || "—"}
              </p>
            </div>
            <p className="dash-note" style={{ gridColumn: "1 / -1" }}>
              {verification.note}
            </p>
          </section>

          <section className="dash-card">
            <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
              {t.dash.staff.privateEvidence}
            </h2>
            <p className="dash-field__hint">{t.dash.staff.privateEvidenceHint}</p>
            <dl className="dash-field-grid dash-field-grid--2" style={{ marginTop: "0.75rem" }}>
              <div>
                <dt className="dash-field__hint">{t.dash.report.description}</dt>
                <dd style={{ margin: "0.2rem 0 0" }}>
                  {verification.privateFoundEvidence.description || "—"}
                </dd>
              </div>
              <div>
                <dt className="dash-field__hint">{t.dash.report.identifier}</dt>
                <dd style={{ margin: "0.2rem 0 0" }}>
                  {verification.privateFoundEvidence.identifier || "—"}
                </dd>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <dt className="dash-field__hint">{t.dash.report.privateDetails}</dt>
                <dd style={{ margin: "0.2rem 0 0" }}>
                  {verification.privateFoundEvidence.privateDetails || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="dash-card">
            <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
              {t.dash.staff.claimantEvidence}
            </h2>
            <dl className="dash-field-grid">
              <div>
                <dt className="dash-field__hint">{t.dash.claims.message}</dt>
                <dd style={{ margin: "0.2rem 0 0" }}>
                  {verification.claimantEvidence.message || "—"}
                </dd>
              </div>
              <div>
                <dt className="dash-field__hint">{t.dash.claims.evidence}</dt>
                <dd style={{ margin: "0.2rem 0 0" }}>
                  {verification.claimantEvidence.evidence || "—"}
                </dd>
              </div>
            </dl>
          </section>

          {canVerify ? (
            <section className="dash-card">
              <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
                {t.dash.staff.verifyTitle}
              </h2>
              <p className="dash-note">{t.dash.staff.verifySubtitle}</p>
              <form className="dash-field-grid" onSubmit={(e) => void onVerify(e)}>
                <div className="dash-field">
                  <label htmlFor="staff-assessment">{t.dash.staff.assessment}</label>
                  <select
                    id="staff-assessment"
                    value={assessment}
                    onChange={(e) =>
                      setAssessment(e.target.value as VerificationAssessment)
                    }
                  >
                    <option value="CONSISTENT">{t.dash.staff.assessmentConsistent}</option>
                    <option value="INCONSISTENT">{t.dash.staff.assessmentInconsistent}</option>
                    <option value="UNCLEAR">{t.dash.staff.assessmentUnclear}</option>
                  </select>
                </div>
                <div className="dash-field">
                  <label htmlFor="staff-verify-notes">{t.dash.staff.notes}</label>
                  <textarea
                    id="staff-verify-notes"
                    rows={3}
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    maxLength={4000}
                  />
                </div>
                <label className="dash-field__hint" style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={requestMoreInfo}
                    onChange={(e) => setRequestMoreInfo(e.target.checked)}
                  />
                  {t.dash.staff.requestMoreInfo}
                </label>
                <button type="submit" className="dash-btn" disabled={busy}>
                  {busy ? t.dash.staff.working : t.dash.staff.verifySubmit}
                </button>
              </form>
            </section>
          ) : null}

          {canDecide ? (
            <section className="dash-card">
              <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
                {t.dash.staff.decisionTitle}
              </h2>
              <p className="dash-note">{t.dash.staff.decisionSubtitle}</p>
              <form className="dash-field-grid" onSubmit={(e) => void onDecide(e)}>
                <div className="dash-field">
                  <label htmlFor="staff-decision">{t.dash.staff.decision}</label>
                  <select
                    id="staff-decision"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value as StaffDecision)}
                  >
                    <option value="APPROVE">{t.dash.staff.decisionApprove}</option>
                    <option value="REJECT">{t.dash.staff.decisionReject}</option>
                    <option value="REQUEST_MORE_INFO">
                      {t.dash.staff.decisionMoreInfo}
                    </option>
                  </select>
                </div>
                <div className="dash-field">
                  <label htmlFor="staff-decision-notes">{t.dash.staff.notes}</label>
                  <textarea
                    id="staff-decision-notes"
                    rows={3}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    maxLength={4000}
                  />
                </div>
                <button type="submit" className="dash-btn" disabled={busy}>
                  {busy ? t.dash.staff.working : t.dash.staff.decisionSubmit}
                </button>
              </form>
            </section>
          ) : null}

          {(canHandover || canReturn || canClose) && (
            <section className="dash-card">
              <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
                {t.dash.staff.lifecycleTitle}
              </h2>
              <p className="dash-note">{t.dash.staff.lifecycleSubtitle}</p>
              <div className="dash-field">
                <label htmlFor="staff-handover-notes">{t.dash.staff.notesOptional}</label>
                <textarea
                  id="staff-handover-notes"
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  maxLength={4000}
                />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "0.75rem" }}>
                {canHandover ? (
                  <button
                    type="button"
                    className="dash-btn"
                    disabled={busy}
                    onClick={() => void onHandoverReady()}
                  >
                    {t.dash.staff.readyHandover}
                  </button>
                ) : null}
                {canReturn ? (
                  <button
                    type="button"
                    className="dash-btn"
                    disabled={busy}
                    onClick={() => void onConfirmReturn()}
                  >
                    {t.dash.staff.confirmReturn}
                  </button>
                ) : null}
                {canClose ? (
                  <button
                    type="button"
                    className="dash-btn"
                    disabled={busy}
                    onClick={() => void onCloseCase()}
                  >
                    {t.dash.staff.closeCase}
                  </button>
                ) : null}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
