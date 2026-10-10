import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  REPORT_CATEGORIES,
  createFoundReport,
  createLostReport,
  type ReportCategory,
} from "../../api/reports";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useLocale } from "../../i18n/context";

export function ReportItemPage() {
  const { t } = useLocale();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = params.get("type") === "found" ? "found" : "lost";

  const [tab, setTab] = useState<"lost" | "found">(initialType);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [description, setDescription] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [privateDetails, setPrivateDetails] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isoFromDateInput = useMemo(() => {
    return (value: string) => {
      if (!value) return "";
      return new Date(`${value}T12:00:00.000Z`).toISOString();
    };
  }, []);

  function validate() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = t.dash.report.required;
    if (!category) next.category = t.dash.report.required;
    if (!description.trim()) next.description = t.dash.report.required;
    if (!location.trim()) next.location = t.dash.report.required;
    if (!eventDate) next.eventDate = t.dash.report.required;
    if (tab === "found" && !publicDescription.trim()) {
      next.publicDescription = t.dash.report.required;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (!validate() || submitting || !accessToken) {
      if (!accessToken) setFormError(t.dash.myReports.error);
      return;
    }

    setSubmitting(true);
    try {
      if (tab === "lost") {
        const result = await createLostReport(accessToken, {
          title: title.trim(),
          category: category as ReportCategory,
          description: description.trim(),
          location: location.trim(),
          lostAt: isoFromDateInput(eventDate),
          privateDetails: privateDetails.trim() || undefined,
          identifier: identifier.trim() || undefined,
        });
        setSuccess(t.dash.report.successLost);
        navigate(`/items/lost/${result.report.id}`, { replace: true });
      } else {
        const result = await createFoundReport(accessToken, {
          title: title.trim(),
          category: category as ReportCategory,
          description: description.trim(),
          publicDescription: publicDescription.trim(),
          location: location.trim(),
          foundAt: isoFromDateInput(eventDate),
          privateDetails: privateDetails.trim() || undefined,
          identifier: identifier.trim() || undefined,
        });
        setSuccess(t.dash.report.successFound);
        navigate(`/items/found/${result.report.id}`, { replace: true });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError(t.dash.browse.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dash-page">
      <header className="dash-page__header">
        <h1>{t.dash.report.title}</h1>
        <p>{t.dash.report.subtitle}</p>
      </header>

      <div className="dash-tabs" role="tablist">
        <button
          type="button"
          className={tab === "lost" ? "is-active" : undefined}
          aria-selected={tab === "lost"}
          onClick={() => setTab("lost")}
        >
          {t.dash.report.lostTab}
        </button>
        <button
          type="button"
          className={tab === "found" ? "is-active" : undefined}
          aria-selected={tab === "found"}
          onClick={() => setTab("found")}
        >
          {t.dash.report.foundTab}
        </button>
      </div>

      <form className="dash-card" onSubmit={onSubmit} noValidate>
        <div className="dash-field-grid dash-field-grid--2">
          <div className="dash-field">
            <label htmlFor="report-title">{t.dash.report.itemName}</label>
            <input
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? <p className="dash-field__error">{errors.title}</p> : null}
          </div>

          <div className="dash-field">
            <label htmlFor="report-category">{t.dash.report.category}</label>
            <select
              id="report-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory | "")}
              aria-invalid={Boolean(errors.category)}
            >
              <option value="">{t.dash.report.selectCategory}</option>
              {REPORT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.dash.categories[cat]}
                </option>
              ))}
            </select>
            {errors.category ? <p className="dash-field__error">{errors.category}</p> : null}
          </div>

          <div className="dash-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="report-description">{t.dash.report.description}</label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? (
              <p className="dash-field__error">{errors.description}</p>
            ) : null}
          </div>

          {tab === "found" ? (
            <div className="dash-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="report-public">{t.dash.report.publicDescription}</label>
              <textarea
                id="report-public"
                value={publicDescription}
                onChange={(e) => setPublicDescription(e.target.value)}
                aria-invalid={Boolean(errors.publicDescription)}
              />
              <p className="dash-field__hint">{t.dash.report.publicDescriptionHint}</p>
              {errors.publicDescription ? (
                <p className="dash-field__error">{errors.publicDescription}</p>
              ) : null}
            </div>
          ) : null}

          <div className="dash-field">
            <label htmlFor="report-date">
              {tab === "lost" ? t.dash.report.dateLost : t.dash.report.dateFound}
            </label>
            <input
              id="report-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              aria-invalid={Boolean(errors.eventDate)}
            />
            {errors.eventDate ? <p className="dash-field__error">{errors.eventDate}</p> : null}
          </div>

          <div className="dash-field">
            <label htmlFor="report-location">{t.dash.report.location}</label>
            <input
              id="report-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              aria-invalid={Boolean(errors.location)}
            />
            {errors.location ? <p className="dash-field__error">{errors.location}</p> : null}
          </div>

          <div className="dash-field">
            <label htmlFor="report-identifier">{t.dash.report.identifier}</label>
            <input
              id="report-identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div className="dash-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="report-private">{t.dash.report.privateDetails}</label>
            <textarea
              id="report-private"
              value={privateDetails}
              onChange={(e) => setPrivateDetails(e.target.value)}
            />
            <p className="dash-field__hint">{t.dash.report.privateDetailsHint}</p>
          </div>
        </div>

        {formError ? <p className="dash-error">{formError}</p> : null}
        {success ? <p className="dash-success">{success}</p> : null}

        <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <button type="submit" className="dash-btn" disabled={submitting}>
            {submitting
              ? t.dash.report.submitting
              : tab === "lost"
                ? t.dash.report.submitLost
                : t.dash.report.submitFound}
          </button>
          <Link to="/dashboard" className="dash-btn dash-btn--ghost">
            {t.dash.detail.back}
          </Link>
        </div>
      </form>
    </div>
  );
}
