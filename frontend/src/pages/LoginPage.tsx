import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginRequest } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthBrand } from "../components/AuthBrand";
import { ThemeToggle } from "../components/ThemeToggle";
import heroCampus from "../assets/hero-campus.jpg";
import "./auth/AuthShell.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const THEME_LABELS = {
  switchToLight: "Switch to light mode",
  switchToDark: "Switch to dark mode",
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    let ok = true;
    const trimmed = email.trim();

    if (!trimmed) {
      setEmailError("Email address is required.");
      ok = false;
    } else if (!EMAIL_RE.test(trimmed)) {
      setEmailError("Enter a valid email address.");
      ok = false;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError("Password is required.");
      ok = false;
    } else {
      setPasswordError(null);
    }

    return ok;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!validate() || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const session = await loginRequest(email.trim(), password);
      setSession(session.user, session.tokens);
      const from = (location.state as { from?: string } | null)?.from;
      const dest =
        typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
          ? from
          : "/dashboard";
      navigate(dest, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "ACCOUNT_DISABLED") {
          setFormError("This account is disabled. Contact campus staff for help.");
        } else if (error.code === "INVALID_CREDENTIALS" || error.status === 401) {
          setFormError("Incorrect email or password.");
        } else {
          setFormError(error.message || "Unable to sign in. Please try again.");
        }
      } else {
        setFormError(
          "Unable to reach the server. Confirm the backend is running, then try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-shell__media" aria-hidden="true">
        <img
          src={heroCampus}
          alt=""
          className="auth-shell__image"
        />
        <div className="auth-shell__overlay" />
      </div>

      <ThemeToggle className="auth-shell__theme" labels={THEME_LABELS} />

      <div className="auth-shell__inner">
        <AuthBrand />

        <section className="auth-card" aria-labelledby="login-heading">
          <h1 id="login-heading" className="auth-card__title">
            Welcome back
          </h1>
          <p className="auth-card__subtitle">Sign in to your account to continue.</p>

          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor={emailId}>Email Address</label>
              <div
                className={`auth-input-wrap${emailError ? " auth-input-wrap--error" : ""}`}
              >
                <Mail className="auth-input-wrap__icon" size={18} aria-hidden="true" />
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (emailError) {
                      setEmailError(null);
                    }
                  }}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? `${emailId}-error` : undefined}
                  disabled={submitting}
                />
              </div>
              {emailError ? (
                <p id={`${emailId}-error`} className="auth-field__error" role="alert">
                  {emailError}
                </p>
              ) : null}
            </div>

            <div className="auth-field">
              <label htmlFor={passwordId}>Password</label>
              <div
                className={`auth-input-wrap${passwordError ? " auth-input-wrap--error" : ""}`}
              >
                <Lock className="auth-input-wrap__icon" size={18} aria-hidden="true" />
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (passwordError) {
                      setPasswordError(null);
                    }
                  }}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? `${passwordId}-error` : undefined}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="auth-input-wrap__toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordError ? (
                <p id={`${passwordId}-error`} className="auth-field__error" role="alert">
                  {passwordError}
                </p>
              ) : null}
            </div>

            <div className="auth-form__row">
              <Link to="/forgot-password" className="auth-link">
                Forgot password?
              </Link>
            </div>

            {formError ? (
              <p className="auth-form__error" role="alert">
                {formError}
              </p>
            ) : null}

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign In"}
              {!submitting ? <ArrowRight size={18} aria-hidden="true" /> : null}
            </button>
          </form>

          <p className="auth-card__footer">
            Don&apos;t have an account? <Link to="/register">Create one</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
