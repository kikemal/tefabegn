import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { ok } from "../types/api";
import { getOwnProfile, getProfileForViewer, updateOwnProfile } from "./service";
import { updateOwnProfileSchema } from "./validation";

export const usersRouter = Router();

function validationError(error: ZodError): AppError {
  const message = error.issues[0]?.message ?? "Invalid request";
  return new AppError(400, "VALIDATION_ERROR", message);
}

usersRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await getOwnProfile(req.user!.id);
    res.status(200).json(ok({ user }));
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const input = updateOwnProfileSchema.parse(req.body);
    const user = await updateOwnProfile(req.user!.id, input);
    res.status(200).json(ok({ user }));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

usersRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (!targetId) {
      throw new AppError(400, "VALIDATION_ERROR", "User id is required");
    }

    const user = await getProfileForViewer(req.user!, targetId);
    res.status(200).json(ok({ user }));
  } catch (error) {
    next(error);
  }
});
