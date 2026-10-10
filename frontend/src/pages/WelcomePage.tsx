import {
  ArrowRight,
  Leaf,
  Package,
  Search,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroCampus from "../assets/hero-campus.jpg";
import {
  categoryImageTone,
  fetchRecentPublicFound,
  type PublicRecentFoundReport,
} from "../api/publicFeed";
import { useLocale } from "../i18n/context";
import "./WelcomePage.css";

type FeedState =
  | { status: "loading" }
  | { status: "ready"; reports: PublicRecentFoundReport[] }
  | { status: "empty" }
  | { status: "error"; message: string };

function formatFoundAt(iso: string | null, locale: string) {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function WelcomePage() {
  const { t, locale } = useLocale();
  const [feed, setFeed] = useState<FeedState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setFeed({ status: "loading" });
    fetchRecentPublicFound(8)
      .then((data) => {
        if (cancelled) {
          return;
        }
        if (!data.reports.length) {
          setFeed({ status: "empty" });
          return;
        }
        setFeed({ status: "ready", reports: data.reports });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error && error.message
            ? error.message
            : t.recent.error;
        setFeed({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, t.recent.error]);

  return (
    <div className="welcome">
      <section className="welcome-hero" aria-labelledby="welcome-hero-title">
        <div className="welcome-hero__media" aria-hidden="true">
          <img src={heroCampus} alt="" className="welcome-hero__image" />
          <div className="welcome-hero__veil" />
        </div>

        <div className="welcome-hero__content">
          <p className="welcome-hero__eyebrow">
            <span className="welcome-hero__eyebrow-rule" aria-hidden="true" />
            {t.hero.eyebrow}
          </p>
          <h1 id="welcome-hero-title" className="welcome-hero__title">
            <span>{t.hero.titleLine1}</span>
            <span>{t.hero.titleLine2}</span>
          </h1>
          <p className="welcome-hero__subtitle">{t.hero.subtitle}</p>

          <div className="welcome-actions" role="group" aria-label={t.nav.primary}>
            <Link
              to="/sign-in"
              state={{ from: "/report?type=lost" }}
              className="action-card action-card--lost"
            >
              <span className="action-card__rings" aria-hidden="true" />
              <Search className="action-card__icon" strokeWidth={1.5} aria-hidden="true" />
              <span className="action-card__title">{t.actions.lostTitle}</span>
              <span className="action-card__desc">{t.actions.lostDescription}</span>
              <span className="action-card__arrow" aria-hidden="true">
                <ArrowRight size={18} />
              </span>
            </Link>

            <Link
              to="/sign-in"
              state={{ from: "/report?type=found" }}
              className="action-card action-card--found"
            >
              <span className="action-card__rings" aria-hidden="true" />
              <Package className="action-card__icon" strokeWidth={1.5} aria-hidden="true" />
              <span className="action-card__title">{t.actions.foundTitle}</span>
              <span className="action-card__desc">{t.actions.foundDescription}</span>
              <span className="action-card__arrow" aria-hidden="true">
                <ArrowRight size={18} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label={t.trust.secureTitle}>
        <ul className="trust-strip__list">
          <li>
            <Shield strokeWidth={1.6} aria-hidden="true" />
            <div>
              <strong>{t.trust.secureTitle}</strong>
              <p>{t.trust.secureBody}</p>
            </div>
          </li>
          <li>
            <Users strokeWidth={1.6} aria-hidden="true" />
            <div>
              <strong>{t.trust.communityTitle}</strong>
              <p>{t.trust.communityBody}</p>
            </div>
          </li>
          <li>
            <ShieldCheck strokeWidth={1.6} aria-hidden="true" />
            <div>
              <strong>{t.trust.verifiedTitle}</strong>
              <p>{t.trust.verifiedBody}</p>
            </div>
          </li>
          <li>
            <Leaf strokeWidth={1.6} aria-hidden="true" />
            <div>
              <strong>{t.trust.saferTitle}</strong>
              <p>{t.trust.saferBody}</p>
            </div>
          </li>
        </ul>
      </section>

      <section className="recent-found" aria-labelledby="recent-found-title">
        <div className="recent-found__inner">
          <div className="recent-found__header">
            <h2 id="recent-found-title" className="recent-found__eyebrow">
              <span className="welcome-hero__eyebrow-rule" aria-hidden="true" />
              {t.recent.eyebrow}
            </h2>
            <Link
              to="/sign-in"
              state={{ from: "/browse" }}
              className="recent-found__view-all"
            >
              {t.recent.viewAll}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {feed.status === "loading" ? (
            <p className="recent-found__status" role="status" aria-live="polite">
              {t.recent.loading}
            </p>
          ) : null}

          {feed.status === "empty" ? (
            <p className="recent-found__status" role="status">
              {t.recent.empty}
            </p>
          ) : null}

          {feed.status === "error" ? (
            <div className="recent-found__status recent-found__status--error" role="alert">
              <p>{t.recent.error}</p>
              <button
                type="button"
                className="recent-found__retry"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                {t.recent.retry}
              </button>
            </div>
          ) : null}

          {feed.status === "ready" ? (
            <ul className="recent-found__grid">
              {feed.reports.map((item) => {
                const tone = categoryImageTone(item.category);
                const foundLabel = formatFoundAt(item.foundAt, locale);
                const detailFrom = `/items/found/${item.id}`;
                return (
                  <li key={item.id}>
                    <Link
                      to="/sign-in"
                      state={{ from: detailFrom }}
                      className="item-card"
                    >
                      <div className={`item-card__media item-card__media--${tone}`}>
                        <span className="item-card__badge" aria-hidden="true" />
                      </div>
                      <div className="item-card__body">
                        <h3>{item.title}</h3>
                        <p>
                          {t.recent.locationPrefix} {item.location}
                        </p>
                        {foundLabel && item.foundAt ? (
                          <time dateTime={item.foundAt}>{foundLabel}</time>
                        ) : null}
                        <span className="item-card__cta">{t.recent.viewDetails}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}
