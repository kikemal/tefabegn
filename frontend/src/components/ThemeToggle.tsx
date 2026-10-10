import { Moon, Sun } from "lucide-react";
import { useLocale } from "../i18n/context";
import { useTheme } from "../theme/context";
import "./ThemeToggle.css";

type ThemeToggleProps = {
  className?: string;
  /** Override labels (e.g. English-only auth screens). */
  labels?: {
    switchToLight: string;
    switchToDark: string;
  };
};

export function ThemeToggle({ className = "", labels }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const isDark = theme === "dark";
  const lightLabel = labels?.switchToLight ?? t.theme.switchToLight;
  const darkLabel = labels?.switchToDark ?? t.theme.switchToDark;
  const label = isDark ? lightLabel : darkLabel;

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <Sun size={18} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Moon size={18} strokeWidth={1.75} aria-hidden="true" />
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}
