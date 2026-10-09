import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env";

const validDbUrl = "postgresql://tefabign:tefabign@127.0.0.1:5433/tefabign?schema=public";

describe("loadEnv", () => {
  it("applies defaults when optional values are missing", () => {
    const env = loadEnv({ DATABASE_URL: validDbUrl });

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBe(validDbUrl);
  });

  it("parses provided values", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      PORT: "4000",
      DATABASE_URL: validDbUrl,
    });

    expect(env.NODE_ENV).toBe("test");
    expect(env.PORT).toBe(4000);
  });

  it("rejects invalid PORT values", () => {
    expect(() => loadEnv({ PORT: "not-a-number", DATABASE_URL: validDbUrl })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it("requires a PostgreSQL DATABASE_URL", () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({ DATABASE_URL: "mysql://localhost/db" })).toThrow(/PostgreSQL/);
  });
});
