import {
  ArrowRight,
  Leaf,
  Package,
  Search,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import heroCampus from "../assets/hero-campus.jpg";
import { MOCK_RECENTLY_FOUND } from "../data/mockFoundItems";
import { useLocale } from "../i18n/context";
import "./WelcomePage.css";

function formatDate(isoDate: string, locale: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function WelcomePage() {
  const { t, locale } = useLocale();

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

          <p className="recent-found__note">{t.recent.mockNote}</p>

          <ul className="recent-found__grid">
            {MOCK_RECENTLY_FOUND.map((item) => (
              <li key={item.id}>
                {/* Sample layout only — not live report IDs. Sign in to browse real items. */}
                <Link
                  to="/sign-in"
                  state={{ from: "/browse" }}
                  className="item-card"
                >
                  <div className={`item-card__media item-card__media--${item.imageTone}`}>
                    <span className="item-card__badge" aria-hidden="true" />
                  </div>
                  <div className="item-card__body">
                    <h3>{item.title}</h3>
                    <p>
                      {t.recent.locationPrefix} {item.location}
                    </p>
                    <time dateTime={item.foundAt}>{formatDate(item.foundAt, locale)}</time>
                    <span className="item-card__cta">{t.recent.viewDetails}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
