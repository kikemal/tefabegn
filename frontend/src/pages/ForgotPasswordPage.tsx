import { Link } from "react-router-dom";
import { AuthBrand } from "../components/AuthBrand";
import { ThemeToggle } from "../components/ThemeToggle";
import heroCampus from "../assets/hero-campus.jpg";
import "./auth/AuthShell.css";

const THEME_LABELS = {
  switchToLight: "Switch to light mode",
  switchToDark: "Switch to dark mode",
};

/**
 * Password reset is not implemented in backend v1.
 * This page keeps the Login "Forgot password?" link honest without faking a flow.
 */
export function ForgotPasswordPage() {
  return (
    <div className="auth-shell">
      <div className="auth-shell__media" aria-hidden="true">
        <img src={heroCampus} alt="" className="auth-shell__image" />
        <div className="auth-shell__overlay" />
      </div>

      <ThemeToggle className="auth-shell__theme" labels={THEME_LABELS} />

      <div className="auth-shell__inner">
        <AuthBrand />

        <section className="auth-card" aria-labelledby="forgot-heading">
          <h1 id="forgot-heading" className="auth-card__title">
            Password reset
          </h1>
          <p className="auth-card__subtitle">
            Self-service password reset is not available in backend v1 yet. If you need
            help accessing your account, contact an authorized campus staff member.
          </p>
          <p className="auth-card__footer" style={{ marginTop: "1.5rem" }}>
            <Link to="/sign-in">Back to sign in</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
