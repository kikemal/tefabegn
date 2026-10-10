import { useLocale } from "../../i18n/context";

export function HelpSupportPage() {
  const { t } = useLocale();

  return (
    <div className="dash-page">
      <header className="dash-page__header">
        <h1>{t.dash.help.title}</h1>
        <p>{t.dash.help.subtitle}</p>
      </header>
      <section className="dash-card">
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.75rem" }}>
          <li>{t.dash.help.body1}</li>
          <li>{t.dash.help.body2}</li>
          <li>{t.dash.help.body3}</li>
          <li>{t.dash.help.body4}</li>
        </ul>
      </section>
    </div>
  );
}
