import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * UI gate only — all staff API routes still enforce requireStaff server-side.
 * Non-staff users are redirected; there is no self-promotion path.
 */
export function RequireStaff({ children }: { children: React.ReactNode }) {
  const { user, authReady, isAuthenticated } = useAuth();

  if (!authReady) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted, #666)" }}
      >
        Checking session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  if (user?.role !== "STAFF") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
