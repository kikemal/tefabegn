import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth, requireStaff } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { ok } from "../types/api";
import {
  getVerificationPackage,
  listClaimsForVerification,
  recordVerificationAttempt,
} from "./service";
import { recordVerificationAttemptSchema } from "./validation";

export const verificationRouter = Router();

function validationError(error: ZodError): AppError {
  const message = error.issues[0]?.message ?? "Invalid request";
  return new AppError(400, "VALIDATION_ERROR", message);
}

verificationRouter.use(requireAuth, requireStaff);

verificationRouter.get("/claims", async (_req, res, next) => {
  try {
    const claims = await listClaimsForVerification();
    res.status(200).json(ok({ claims, autoApproval: false }));
  } catch (error) {
    next(error);
  }
});

verificationRouter.get("/claims/:claimId", async (req, res, next) => {
  try {
    const claimId = req.params.claimId;
    if (!claimId) {
      throw new AppError(400, "VALIDATION_ERROR", "Claim id is required");
    }
    const verification = await getVerificationPackage(claimId);
    res.status(200).json(ok({ verification }));
  } catch (error) {
    next(error);
  }
});

verificationRouter.post("/claims/:claimId/attempts", async (req, res, next) => {
  try {
    const claimId = req.params.claimId;
    if (!claimId) {
      throw new AppError(400, "VALIDATION_ERROR", "Claim id is required");
    }
    const input = recordVerificationAttemptSchema.parse(req.body);
    const result = await recordVerificationAttempt(req.user!, claimId, input);
    res.status(200).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});
