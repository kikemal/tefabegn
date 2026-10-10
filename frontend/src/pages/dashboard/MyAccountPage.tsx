import { useNavigate } from "react-router-dom";
import { logoutRequest } from "../../api/auth";
import { useAuth } from "../../auth/AuthContext";
import { useLocale, type Locale } from "../../i18n/context";
import { useTheme, type Theme } from "../../theme/context";

export function MyAccountPage() {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const { user, refreshToken, clearSession } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } catch {
      // Ignore revoke failures.
    }
    clearSession();
    navigate("/sign-in", { replace: true });
  }

  if (!user) {
    return (
      <div className="dash-page">
        <p className="dash-empty">{t.dash.account.noProfile}</p>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <header className="dash-page__header">
        <h1>{t.dash.account.title}</h1>
        <p>{t.dash.account.subtitle}</p>
      </header>

      <section className="dash-card" aria-labelledby="account-profile">
        <h2 id="account-profile" style={{ marginTop: 0, fontSize: "1.05rem" }}>
          {t.dash.account.profile}
        </h2>
        <dl className="dash-field-grid dash-field-grid--2" style={{ margin: "0.75rem 0 0" }}>
          <div>
            <dt className="dash-field__hint">{t.dash.account.fullName}</dt>
            <dd style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>{user.fullName}</dd>
          </div>
          <div>
            <dt className="dash-field__hint">{t.dash.account.email}</dt>
            <dd style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>{user.email}</dd>
          </div>
          <div>
            <dt className="dash-field__hint">{t.dash.account.role}</dt>
            <dd style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>{user.role}</dd>
          </div>
        </dl>
      </section>

      <section className="dash-card dash-field-grid dash-field-grid--2">
        <div className="dash-field">
          <label htmlFor="account-language">{t.dash.account.language}</label>
          <select
            id="account-language"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            <option value="en">English</option>
            <option value="am">አማርኛ</option>
          </select>
        </div>
        <div className="dash-field">
          <label htmlFor="account-theme">{t.dash.account.theme}</label>
          <select
            id="account-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            <option value="light">{t.dash.account.light}</option>
            <option value="dark">{t.dash.account.dark}</option>
          </select>
        </div>
      </section>

      <button type="button" className="dash-btn" onClick={() => void signOut()}>
        {t.dash.account.signOut}
      </button>
    </div>
  );
}
