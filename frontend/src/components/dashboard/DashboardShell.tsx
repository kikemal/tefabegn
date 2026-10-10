import {
  CircleHelp,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { logoutRequest } from "../../api/auth";
import { useAuth } from "../../auth/AuthContext";
import { useLocale } from "../../i18n/context";
import { LanguageSelector } from "../LanguageSelector";
import { ThemeToggle } from "../ThemeToggle";
import "../../styles/dashboard.css";

const NAV = [
  { to: "/dashboard", key: "dashboard" as const, icon: LayoutDashboard, end: true },
  { to: "/browse", key: "browse" as const, icon: Search, end: false },
  { to: "/report", key: "report" as const, icon: FilePlus2, end: false },
  { to: "/my-reports", key: "myReports" as const, icon: ClipboardList, end: false },
  { to: "/account", key: "account" as const, icon: UserRound, end: false },
  { to: "/help", key: "help" as const, icon: CircleHelp, end: false },
];

function initials(name: string | undefined, email: string | undefined) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function DashboardShell() {
  const { t } = useLocale();
  const { user, refreshToken, clearSession } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const userMenuId = useId();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-ui", "dashboard");
    return () => {
      document.documentElement.removeAttribute("data-ui");
    };
  }, []);

  useEffect(() => {
    if (!userMenuOpen) {
      return;
    }
    function onPointer(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [userMenuOpen]);

  async function signOut() {
    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } catch {
      // Clear local session even if revoke fails.
    }
    clearSession();
    navigate("/sign-in", { replace: true });
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    const q = search.trim();
    navigate(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
    setMenuOpen(false);
  }

  return (
    <div className="dash-shell" data-ui="dashboard">
      {menuOpen ? (
        <button
          type="button"
          className="dash-sidebar__backdrop"
          aria-label={t.dash.nav.closeMenu}
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside className={`dash-sidebar${menuOpen ? " is-open" : ""}`} aria-label={t.dash.nav.brand}>
        <Link to="/dashboard" className="dash-sidebar__brand" onClick={() => setMenuOpen(false)}>
          <span className="dash-sidebar__brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
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
          <span className="dash-sidebar__brand-text">
            <span className="dash-sidebar__brand-name">{t.dash.nav.brand}</span>
            <span className="dash-sidebar__brand-tag">{t.brand.descriptor}</span>
          </span>
        </Link>

        <nav className="dash-sidebar__nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `dash-nav-link${isActive ? " is-active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                {t.dash.nav[item.key]}
              </NavLink>
            );
          })}
        </nav>

        <div className="dash-sidebar__footer">
          <button type="button" className="dash-sidebar__signout" onClick={() => void signOut()}>
            <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
            {t.dash.nav.signOut}
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <button
            type="button"
            className="dash-topbar__menu"
            aria-label={menuOpen ? t.dash.nav.closeMenu : t.dash.nav.openMenu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>

          <form className="dash-topbar__search" onSubmit={onSearchSubmit} role="search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.dash.topbar.searchPlaceholder}
              aria-label={t.dash.topbar.searchPlaceholder}
            />
          </form>

          <div className="dash-topbar__actions">
            <LanguageSelector />
            <ThemeToggle />
            <div className="dash-user" ref={userMenuRef}>
              <button
                type="button"
                className="dash-user__btn"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-controls={userMenuId}
                aria-label={t.dash.topbar.userMenu}
                onClick={() => setUserMenuOpen((open) => !open)}
              >
                <span className="dash-user__avatar" aria-hidden="true">
                  {initials(user?.fullName, user?.email)}
                </span>
              </button>
              {userMenuOpen ? (
                <div id={userMenuId} className="dash-user__menu" role="menu">
                  <Link
                    to="/account"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    {t.dash.topbar.accountSettings}
                  </Link>
                  <button type="button" role="menuitem" onClick={() => void signOut()}>
                    {t.dash.topbar.signOut}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="dash-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
