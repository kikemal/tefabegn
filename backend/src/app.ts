import express from "express";
import { authRouter } from "./auth/routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { healthRouter } from "./routes/health";
import { usersRouter } from "./users/routes";

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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
