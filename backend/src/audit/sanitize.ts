import type { Prisma } from "@prisma/client";
import { PRIVATE_METADATA_KEYS } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Strip private/sensitive keys from audit metadata (write + read defense).
 */
export function sanitizeAuditMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeAuditMetadata(entry) ?? null) as Prisma.InputJsonValue;
  }

  if (!isPlainObject(value)) {
    return value as Prisma.InputJsonValue;
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (PRIVATE_METADATA_KEYS.has(key)) {
      continue;
    }
    cleaned[key] = sanitizeAuditMetadata(entry);
  }
  return cleaned as Prisma.InputJsonValue;
}
