import { Router } from "express";
import { ZodError } from "zod";
import { AppError } from "../../middleware/errorHandler";
import { publicFeedRateLimiter } from "../../middleware/rateLimit";
import { ok } from "../../types/api";
import { listRecentPublicFound } from "./service";
import { recentFoundQuerySchema } from "./validation";

export const publicReportsRouter = Router();

function validationError(error: ZodError): AppError {
  const message = error.issues[0]?.message ?? "Invalid request";
  return new AppError(400, "VALIDATION_ERROR", message);
}

publicReportsRouter.use(publicFeedRateLimiter);

/**
 * GET /reports/public/recent-found
 * Anonymous, read-only, public-safe found preview for the welcome page.
 */
publicReportsRouter.get("/recent-found", async (req, res, next) => {
  try {
    const query = recentFoundQuerySchema.parse(req.query);
    const result = await listRecentPublicFound(query);
    res.status(200).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});
