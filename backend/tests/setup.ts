process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://tefabign:tefabign@127.0.0.1:5433/tefabign?schema=public";
process.env.JWT_SECRET ??= "test-only-jwt-secret-at-least-32-chars-long";
process.env.JWT_ACCESS_EXPIRES_IN ??= "1h";
process.env.REFRESH_TOKEN_DAYS ??= "30";
process.env.CORS_ORIGINS ??= "http://localhost:5173";
process.env.RATE_LIMIT_ENABLED ??= "false";
