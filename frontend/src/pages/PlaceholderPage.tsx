import { Link } from "react-router-dom";
import { useLocale } from "../i18n/context";
import "./PlaceholderPage.css";

type PlaceholderKey =
  | "browse"
  | "reports"
  | "about"
  | "signIn"
  | "lost"
  | "found"
  | "item";

const COPY: Record<
  PlaceholderKey,
  { title: "browseTitle" | "reportsTitle" | "aboutTitle" | "signInTitle" | "lostTitle" | "foundTitle" | "itemTitle"; body: "browseBody" | "reportsBody" | "aboutBody" | "signInBody" | "lostBody" | "foundBody" | "itemBody" }
> = {
  browse: { title: "browseTitle", body: "browseBody" },
  reports: { title: "reportsTitle", body: "reportsBody" },
  about: { title: "aboutTitle", body: "aboutBody" },
  signIn: { title: "signInTitle", body: "signInBody" },
  lost: { title: "lostTitle", body: "lostBody" },
  found: { title: "foundTitle", body: "foundBody" },
  item: { title: "itemTitle", body: "itemBody" },
};

export function PlaceholderPage({ kind }: { kind: PlaceholderKey }) {
  const { t } = useLocale();
  const keys = COPY[kind];

  return (
    <section className="placeholder-page">
      <div className="placeholder-page__card">
        <h1>{t.placeholders[keys.title]}</h1>
        <p>{t.placeholders[keys.body]}</p>
        <Link to="/" className="placeholder-page__back">
          {t.placeholders.backHome}
        </Link>
      </div>
    </section>
  );
}
