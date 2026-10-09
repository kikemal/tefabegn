import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth, requireStaff } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { ok } from "../types/api";
import { closeCaseByStaff, confirmReturnByStaff } from "../handover/service";
import { closeCaseSchema, confirmReturnSchema } from "../handover/validation";
import {
  decideClaim,
  getStaffClaimReview,
  listClaimsForStaffReview,
  listMatchesForStaffReview,
  listReportsForStaffReview,
  markFoundReadyForHandover,
} from "./service";
import { readyForHandoverSchema, staffClaimDecisionSchema } from "./validation";

export const staffRouter = Router();

function validationError(error: ZodError): AppError {
  const message = error.issues[0]?.message ?? "Invalid request";
  return new AppError(400, "VALIDATION_ERROR", message);
}

staffRouter.use(requireAuth, requireStaff);

staffRouter.get("/reports", async (_req, res, next) => {
  try {
    const reports = await listReportsForStaffReview();
    res.status(200).json(ok({ reports }));
  } catch (error) {
    next(error);
  }
});

staffRouter.get("/matches", async (_req, res, next) => {
  try {
    const matches = await listMatchesForStaffReview();
    res.status(200).json(ok({ matches }));
  } catch (error) {
    next(error);
  }
});

staffRouter.get("/claims", async (_req, res, next) => {
  try {
    const claims = await listClaimsForStaffReview();
    res.status(200).json(ok({ claims }));
  } catch (error) {
    next(error);
  }
});

staffRouter.get("/claims/:claimId", async (req, res, next) => {
  try {
    const claimId = req.params.claimId;
    if (!claimId) {
      throw new AppError(400, "VALIDATION_ERROR", "Claim id is required");
    }
    const review = await getStaffClaimReview(claimId);
    res.status(200).json(ok(review));
  } catch (error) {
    next(error);
  }
});

staffRouter.post("/claims/:claimId/decision", async (req, res, next) => {
  try {
    const claimId = req.params.claimId;
    if (!claimId) {
      throw new AppError(400, "VALIDATION_ERROR", "Claim id is required");
    }
    const input = staffClaimDecisionSchema.parse(req.body);
    const result = await decideClaim(req.user!, claimId, input);
    res.status(200).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

staffRouter.post("/reports/found/:foundReportId/ready-for-handover", async (req, res, next) => {
  try {
    const foundReportId = req.params.foundReportId;
    if (!foundReportId) {
      throw new AppError(400, "VALIDATION_ERROR", "Found report id is required");
    }
    const input = readyForHandoverSchema.parse(req.body ?? {});
    const result = await markFoundReadyForHandover(req.user!, foundReportId, input);
    res.status(200).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

staffRouter.post("/reports/found/:foundReportId/confirm-return", async (req, res, next) => {
  try {
    const foundReportId = req.params.foundReportId;
    if (!foundReportId) {
      throw new AppError(400, "VALIDATION_ERROR", "Found report id is required");
    }
    const input = confirmReturnSchema.parse(req.body ?? {});
    const result = await confirmReturnByStaff(req.user!, foundReportId, input);
    res.status(200).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

staffRouter.post("/reports/found/:foundReportId/close-case", async (req, res, next) => {
  try {
    const foundReportId = req.params.foundReportId;
    if (!foundReportId) {
      throw new AppError(400, "VALIDATION_ERROR", "Found report id is required");
    }
    const input = closeCaseSchema.parse(req.body ?? {});
    const result = await closeCaseByStaff(req.user!, foundReportId, input);
    res.status(200).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});
