import express from "express";
import { authRouter } from "./auth/routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { claimsRouter } from "./claims/routes";
import { matchesRouter } from "./matching/routes";
import { foundReportsRouter } from "./reports/found/routes";
import { lostReportsRouter } from "./reports/lost/routes";
import { searchReportsRouter } from "./reports/search/routes";
import { healthRouter } from "./routes/health";
import { usersRouter } from "./users/routes";
import { verificationRouter } from "./verification/routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
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
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/reports/lost", lostReportsRouter);
  app.use("/reports/found", foundReportsRouter);
  app.use("/reports/search", searchReportsRouter);
  app.use("/matches", matchesRouter);
  app.use("/claims", claimsRouter);
  app.use("/verification", verificationRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
