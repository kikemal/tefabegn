import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { ok } from "../types/api";
import { confirmReceiptByClaimant } from "../handover/service";
import { confirmReceiptSchema } from "../handover/validation";
import { createClaim, getClaimById, listMyClaims, withdrawClaim } from "./service";
import { createClaimSchema } from "./validation";

export const claimsRouter = Router();

function validationError(error: ZodError): AppError {
  const message = error.issues[0]?.message ?? "Invalid request";
  return new AppError(400, "VALIDATION_ERROR", message);
}

claimsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const input = createClaimSchema.parse(req.body);
    const result = await createClaim(req.user!, input);
    res.status(201).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

claimsRouter.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const claims = await listMyClaims(req.user!.id);
    res.status(200).json(ok({ claims }));
  } catch (error) {
    next(error);
  }
});

claimsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Claim id is required");
    }
    const claim = await getClaimById(req.user!, id);
    res.status(200).json(ok({ claim }));
  } catch (error) {
    next(error);
  }
});

claimsRouter.post("/:id/withdraw", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Claim id is required");
    }
    const claim = await withdrawClaim(req.user!, id);
    res.status(200).json(ok({ claim }));
  } catch (error) {
    next(error);
  }
});

claimsRouter.post("/:id/confirm-receipt", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Claim id is required");
    }
    const input = confirmReceiptSchema.parse(req.body ?? {});
    const result = await confirmReceiptByClaimant(req.user!, id, input);
    res.status(200).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});
