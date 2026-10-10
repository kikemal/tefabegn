import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { meRequest, type AuthTokens, type PublicUser } from "../api/auth";
import { ApiError } from "../api/client";
import {
  clearPersistedSession,
  persistSession,
  persistUser,
  readStoredAccessToken,
  readStoredRefreshToken,
  readStoredUser,
  refreshSessionTokens,
  subscribeSession,
} from "./sessionStore";

type AuthContextValue = {
  user: PublicUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** False while startup restore (/auth/me + refresh) is in progress. */
  authReady: boolean;
  setSession: (user: PublicUser, tokens: AuthTokens) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readSnapshot(): {
  user: PublicUser | null;
  accessToken: string | null;
  refreshToken: string | null;
} {
  return {
    user: readStoredUser(),
    accessToken: readStoredAccessToken(),
    refreshToken: readStoredRefreshToken(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = readSnapshot();
  const [user, setUser] = useState<PublicUser | null>(initial.user);
  const [accessToken, setAccessToken] = useState<string | null>(initial.accessToken);
  const [refreshToken, setRefreshToken] = useState<string | null>(initial.refreshToken);
  const [authReady, setAuthReady] = useState(
    () => !initial.accessToken && !initial.refreshToken,
  );

  const syncFromStore = useCallback(() => {
    const snap = readSnapshot();
    setUser(snap.user);
    setAccessToken(snap.accessToken);
    setRefreshToken(snap.refreshToken);
  }, []);

  useEffect(() => subscribeSession(syncFromStore), [syncFromStore]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const access = readStoredAccessToken();
      const refresh = readStoredRefreshToken();

      if (!access && !refresh) {
        if (!cancelled) {
          setAuthReady(true);
        }
        return;
      }

      try {
        let token = access;
        if (!token && refresh) {
          const tokens = await refreshSessionTokens();
          token = tokens.accessToken;
        }

        if (!token) {
          clearPersistedSession();
          return;
        }

        const result = await meRequest(token);
        if (cancelled) {
          return;
        }

        persistUser(result.user);
        setUser(result.user);
        setAccessToken(readStoredAccessToken());
        setRefreshToken(readStoredRefreshToken());
      } catch (error) {
        if (cancelled) {
          return;
        }
        const authFailed =
          error instanceof ApiError &&
          (error.status === 401 ||
            error.status === 403 ||
            error.code === "INVALID_REFRESH_TOKEN" ||
            error.code === "UNAUTHORIZED" ||
            error.code === "ACCOUNT_DISABLED");

        if (authFailed) {
          clearPersistedSession();
          setUser(null);
          setAccessToken(null);
          setRefreshToken(null);
        } else {
          // Network/server errors: keep stored tokens so a reload can retry.
          syncFromStore();
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [syncFromStore]);

  const setSession = useCallback((nextUser: PublicUser, tokens: AuthTokens) => {
    persistSession(nextUser, tokens);
    setUser(nextUser);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    setAuthReady(true);
  }, []);

  const clearSession = useCallback(() => {
    clearPersistedSession();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(user && accessToken),
      authReady,
      setSession,
      clearSession,
    }),
    [user, accessToken, refreshToken, authReady, setSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
