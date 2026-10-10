import { useLocale, type Locale } from "../i18n/context";
import "./LanguageSelector.css";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  function select(next: Locale) {
    setLocale(next);
  }

  return (
    <div
      className={`language-selector ${className}`.trim()}
      role="group"
      aria-label={t.language.label}
    >
      <button
        type="button"
        className={locale === "am" ? "is-active" : undefined}
        aria-pressed={locale === "am"}
        onClick={() => select("am")}
      >
        {t.language.am}
      </button>
      <span className="language-selector__sep" aria-hidden="true">
        |
      </span>
      <button
        type="button"
        className={locale === "en" ? "is-active" : undefined}
        aria-pressed={locale === "en"}
        onClick={() => select("en")}
      >
        {t.language.en}
      </button>
    </div>
  );
}
