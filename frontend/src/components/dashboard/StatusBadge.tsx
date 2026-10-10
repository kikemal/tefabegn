import { useLocale } from "../../i18n/context";

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const { t } = useLocale();
  const key = status as keyof typeof t.dash.status;
  const text = label || t.dash.status[key] || status;

  return (
    <span className="dash-status" title={text}>
      <span className="sr-only">{t.dash.home.status}: </span>
      {text}
    </span>
  );
}
