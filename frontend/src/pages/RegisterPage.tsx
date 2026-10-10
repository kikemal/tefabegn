import { ArrowRight, Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerRequest } from "../api/auth";
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

export function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    let ok = true;
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setNameError("Full name is required.");
      ok = false;
    } else {
      setNameError(null);
    }

    if (!trimmedEmail) {
      setEmailError("Email address is required.");
      ok = false;
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      setEmailError("Enter a valid email address.");
      ok = false;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError("Password is required.");
      ok = false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
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
      const session = await registerRequest({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });
      setSession(session.user, session.tokens);
      navigate("/my-reports", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "EMAIL_IN_USE" || error.status === 409) {
          setFormError("An account with this email already exists. Try signing in.");
        } else if (error.code === "VALIDATION_ERROR") {
          setFormError(error.message);
        } else {
          setFormError(error.message || "Unable to create your account.");
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
        <img src={heroCampus} alt="" className="auth-shell__image" />
        <div className="auth-shell__overlay" />
      </div>

      <ThemeToggle className="auth-shell__theme" labels={THEME_LABELS} />

      <div className="auth-shell__inner">
        <AuthBrand />

        <section className="auth-card" aria-labelledby="register-heading">
          <h1 id="register-heading" className="auth-card__title">
            Create your account
          </h1>
          <p className="auth-card__subtitle">
            Join Tefabign to report lost and found items on campus.
          </p>

          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor={nameId}>Full name</label>
              <div className={`auth-input-wrap${nameError ? " auth-input-wrap--error" : ""}`}>
                <UserRound className="auth-input-wrap__icon" size={18} aria-hidden="true" />
                <input
                  id={nameId}
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    if (nameError) {
                      setNameError(null);
                    }
                  }}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? `${nameId}-error` : undefined}
                  disabled={submitting}
                />
              </div>
              {nameError ? (
                <p id={`${nameId}-error`} className="auth-field__error" role="alert">
                  {nameError}
                </p>
              ) : null}
            </div>

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
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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

            {formError ? (
              <p className="auth-form__error" role="alert">
                {formError}
              </p>
            ) : null}

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
              {!submitting ? <ArrowRight size={18} aria-hidden="true" /> : null}
            </button>
          </form>

          <p className="auth-card__footer">
            Already have an account? <Link to="/sign-in">Sign in</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
