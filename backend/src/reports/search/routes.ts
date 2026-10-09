import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";
import { ok } from "../../types/api";
import { searchReports } from "./service";
import { searchReportsQuerySchema } from "./validation";

export const searchReportsRouter = Router();

function validationError(error: ZodError): AppError {
  const message = error.issues[0]?.message ?? "Invalid request";
  return new AppError(400, "VALIDATION_ERROR", message);
}

searchReportsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const query = searchReportsQuerySchema.parse(req.query);
    const result = await searchReports(query);
    res.status(200).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});
