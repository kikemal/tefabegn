import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env";

const validDbUrl = "postgresql://tefabign:tefabign@127.0.0.1:5433/tefabign?schema=public";
const validJwtSecret = "test-only-jwt-secret-at-least-32-chars-long";

describe("loadEnv", () => {
  it("applies defaults when optional values are missing", () => {
    const env = loadEnv({ DATABASE_URL: validDbUrl, JWT_SECRET: validJwtSecret });

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBe(validDbUrl);
    expect(env.JWT_ACCESS_EXPIRES_IN).toBe("8h");
    expect(env.REFRESH_TOKEN_DAYS).toBe(30);
  });

  it("parses provided values", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      PORT: "4000",
      DATABASE_URL: validDbUrl,
      JWT_SECRET: validJwtSecret,
      JWT_ACCESS_EXPIRES_IN: "1h",
      REFRESH_TOKEN_DAYS: "14",
    });

    expect(env.NODE_ENV).toBe("test");
    expect(env.PORT).toBe(4000);
    expect(env.JWT_ACCESS_EXPIRES_IN).toBe("1h");
    expect(env.REFRESH_TOKEN_DAYS).toBe(14);
  });

  it("rejects invalid PORT values", () => {
    expect(() =>
      loadEnv({ PORT: "not-a-number", DATABASE_URL: validDbUrl, JWT_SECRET: validJwtSecret }),
    ).toThrow(/Invalid environment configuration/);
  });

  it("requires a PostgreSQL DATABASE_URL", () => {
    expect(() => loadEnv({ JWT_SECRET: validJwtSecret })).toThrow(/DATABASE_URL/);
    expect(() =>
      loadEnv({ DATABASE_URL: "mysql://localhost/db", JWT_SECRET: validJwtSecret }),
    ).toThrow(/PostgreSQL/);
  });

  it("requires a sufficiently long JWT_SECRET", () => {
    expect(() => loadEnv({ DATABASE_URL: validDbUrl, JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
  });
});
