const SENSITIVE_KEY =
  /password|token|authorization|cookie|secret|privateDetails|evidence|identifier|proofRef|imageRef/i;

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) {
    return "[REDACTED]";
  }
  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}…[truncated]`;
  }
  return value;
}

/** JSON-safe error logging that avoids dumping secrets/PII fields. */
export function logSafeError(label: string, err: unknown): void {
  if (err instanceof Error) {
    const safe: Record<string, unknown> = {
      name: err.name,
      message: err.message,
    };
    // Never log stack in production responses; stack stays server-side only.
    if (process.env.NODE_ENV !== "production") {
      safe.stack = err.stack;
    }
    console.error(label, safe);
    return;
  }

  if (err && typeof err === "object") {
    const entries = Object.entries(err as Record<string, unknown>).map(([key, value]) => [
      key,
      redactValue(key, value),
    ]);
    console.error(label, Object.fromEntries(entries));
    return;
  }

  console.error(label, err);
}
