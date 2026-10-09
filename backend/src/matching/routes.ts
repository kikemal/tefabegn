import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { ok } from "../types/api";
import { generateMatches, getMatchById, listMatches } from "./service";
import { generateMatchesSchema, listMatchesQuerySchema } from "./validation";

export const matchesRouter = Router();

function validationError(error: ZodError): AppError {
  const message = error.issues[0]?.message ?? "Invalid request";
  return new AppError(400, "VALIDATION_ERROR", message);
}

matchesRouter.post("/generate", requireAuth, async (req, res, next) => {
  try {
    const input = generateMatchesSchema.parse(req.body);
    const result = await generateMatches(req.user!, input);
    res.status(200).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

matchesRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const query = listMatchesQuerySchema.parse(req.query);
    const matches = await listMatches(req.user!, query);
    res.status(200).json(ok({ matches, suggestionOnly: true }));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

matchesRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Match id is required");
    }
    const match = await getMatchById(req.user!, id);
    res.status(200).json(ok({ match }));
  } catch (error) {
    next(error);
  }
});
