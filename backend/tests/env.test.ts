import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env";

describe("loadEnv", () => {
  it("applies defaults when optional values are missing", () => {
    const env = loadEnv({});

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
  });

  it("parses provided values", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      PORT: "4000",
    });

    expect(env.NODE_ENV).toBe("test");
    expect(env.PORT).toBe(4000);
  });

  it("rejects invalid PORT values", () => {
    expect(() => loadEnv({ PORT: "not-a-number" })).toThrow(/Invalid environment configuration/);
  });
});
