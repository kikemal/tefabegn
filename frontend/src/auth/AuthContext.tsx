import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthTokens, PublicUser } from "../api/auth";

const ACCESS_KEY = "tefabign.accessToken";
const REFRESH_KEY = "tefabign.refreshToken";
const USER_KEY = "tefabign.user";

type AuthContextValue = {
  user: PublicUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setSession: (user: PublicUser, tokens: AuthTokens) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): PublicUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

function readStoredToken(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(() => readStoredUser());
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    readStoredToken(ACCESS_KEY),
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    readStoredToken(REFRESH_KEY),
  );

  const setSession = useCallback((nextUser: PublicUser, tokens: AuthTokens) => {
    setUser(nextUser);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      localStorage.setItem(ACCESS_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    } catch {
      // Ignore persistence failures.
    }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    try {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      // Ignore persistence failures.
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(user && accessToken),
      setSession,
      clearSession,
    }),
    [user, accessToken, refreshToken, setSession, clearSession],
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
