import { Menu, UserRound, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useLocale } from "../i18n/context";
import { LanguageSelector } from "./LanguageSelector";
import { Logo } from "./Logo";
import "./SiteHeader.css";

const NAV_ITEMS = [
  { to: "/", key: "home" as const, end: true },
  { to: "/browse", key: "browse" as const, end: false },
  { to: "/my-reports", key: "myReports" as const, end: false },
  { to: "/about", key: "about" as const, end: false },
];

export function SiteHeader() {
  const { t } = useLocale();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Logo />

        <nav className="site-header__nav" aria-label={t.nav.primary}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `site-header__link${isActive ? " is-active" : ""}`
              }
            >
              {t.nav[item.key]}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <LanguageSelector className="site-header__lang" />
          <NavLink to="/sign-in" className="site-header__sign-in">
            <UserRound size={16} aria-hidden="true" />
            <span>{t.nav.signIn}</span>
          </NavLink>
          <button
            type="button"
            className="site-header__menu-btn"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id={menuId}
        className={`site-header__drawer${menuOpen ? " is-open" : ""}`}
        hidden={!menuOpen}
      >
        <nav aria-label={t.nav.primary}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `site-header__drawer-link${isActive ? " is-active" : ""}`
              }
            >
              {t.nav[item.key]}
            </NavLink>
          ))}
        </nav>
        <div className="site-header__drawer-footer">
          <LanguageSelector />
          <NavLink to="/sign-in" className="site-header__sign-in site-header__sign-in--block">
            <UserRound size={16} aria-hidden="true" />
            <span>{t.nav.signIn}</span>
          </NavLink>
        </div>
      </div>
    </header>
  );
}
