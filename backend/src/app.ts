import express from "express";
import { authRouter } from "./auth/routes";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRateLimiter, authRateLimiter } from "./middleware/rateLimit";
import { securityHeaders } from "./middleware/securityHeaders";
import { claimsRouter } from "./claims/routes";
import { matchesRouter } from "./matching/routes";
import { foundReportsRouter } from "./reports/found/routes";
import { lostReportsRouter } from "./reports/lost/routes";
import { publicReportsRouter } from "./reports/public/routes";
import { searchReportsRouter } from "./reports/search/routes";
import { notificationsRouter } from "./notifications/routes";
import { healthRouter } from "./routes/health";
import { staffRouter } from "./staff/routes";
import { usersRouter } from "./users/routes";
import { verificationRouter } from "./verification/routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(apiRateLimiter);
  app.use(express.json({ limit: "100kb" }));

  app.get("/", (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        name: "ጠፋብኝ (Tefabign)",
        description: "University Campus Lost & Found API",
        health: "/health",
      },
    });
  });

  app.use("/health", healthRouter);
  app.use("/auth", authRateLimiter, authRouter);
  app.use("/users", usersRouter);
  app.use("/reports/lost", lostReportsRouter);
  // Public feed must be registered under /reports/public (not /reports/found/:id).
  app.use("/reports/public", publicReportsRouter);
  app.use("/reports/found", foundReportsRouter);
  app.use("/reports/search", searchReportsRouter);
  app.use("/matches", matchesRouter);
  app.use("/claims", claimsRouter);
  app.use("/verification", verificationRouter);
  app.use("/staff", staffRouter);
  app.use("/notifications", notificationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
