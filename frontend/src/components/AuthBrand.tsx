import { Link } from "react-router-dom";
import "./AuthBrand.css";

/** English-only brand mark for authentication screens. */
export function AuthBrand() {
  return (
    <Link to="/" className="auth-brand" aria-label="Tefabign home">
      <span className="auth-brand__mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
          <path
            d="M20 3.5C13.1 3.5 7.5 9 7.5 15.7c0 7.8 9 16.8 11.5 19.1a1.5 1.5 0 0 0 2 0C23.5 32.5 32.5 23.5 32.5 15.7 32.5 9 26.9 3.5 20 3.5Z"
            fill="currentColor"
          />
          <path
            d="M20 12.2c-1.9-1.8-5-1.5-6.5.7-1.4 2-.8 4.7 1.2 6l5.3 4.1 5.3-4.1c2-1.3 2.6-4 1.2-6-1.5-2.2-4.6-2.5-6.5-.7Z"
            fill="var(--color-ivory)"
          />
        </svg>
      </span>
      <span className="auth-brand__text">
        <span className="auth-brand__name">TEFABIGN</span>
        <span className="auth-brand__tagline">CAMPUS LOST &amp; FOUND</span>
      </span>
    </Link>
  );
}
