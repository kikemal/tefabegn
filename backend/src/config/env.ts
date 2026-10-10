import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("8h"),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  /** Comma-separated browser origins. Empty = allow all in non-production only. */
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  RATE_LIMIT_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
});

export type Env = z.infer<typeof envSchema>;

const INSECURE_JWT_SECRETS = new Set([
  "dev-only-change-me-to-a-long-random-secret",
  "test-only-jwt-secret-at-least-32-chars-long",
  "changemechangemechangemechangeme",
]);

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const data = parsed.data;
  if (data.NODE_ENV === "production" && INSECURE_JWT_SECRETS.has(data.JWT_SECRET)) {
    throw new Error(
      "Invalid environment configuration: JWT_SECRET must not use a known insecure default in production",
    );
  }
  if (data.NODE_ENV === "production" && data.CORS_ORIGINS.length === 0) {
    throw new Error(
      "Invalid environment configuration: CORS_ORIGINS must be set in production (comma-separated origins)",
    );
  }

  return data;
}

export const env = loadEnv();
