import { Router } from "express";
import { ok } from "../types/api";

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
