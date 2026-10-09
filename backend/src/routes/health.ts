import { Router } from "express";
import { checkDatabaseConnection } from "../db/prisma";
import { fail, ok } from "../types/api";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json(
    ok({
      status: "ok",
      service: "tefabign-backend",
      timestamp: new Date().toISOString(),
    }),
  );
});

healthRouter.get("/ready", async (_req, res) => {
  try {
    await checkDatabaseConnection();
    res.status(200).json(
      ok({
        status: "ready",
        service: "tefabign-backend",
        database: "up",
        timestamp: new Date().toISOString(),
      }),
    );
  } catch {
    res.status(503).json(fail("SERVICE_UNAVAILABLE", "Database connection failed"));
  }
});
