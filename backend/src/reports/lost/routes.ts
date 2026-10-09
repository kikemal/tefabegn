import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth, requireStaff } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";
import { ok } from "../../types/api";
import {
  cancelLostReport,
  closeLostReport,
  createLostReport,
  getLostReportForViewer,
  listLostReportsForStaff,
  listMyLostReports,
  updateLostReport,
} from "./service";
import { createLostReportSchema, updateLostReportSchema } from "./validation";

export const lostReportsRouter = Router();

function validationError(error: ZodError): AppError {
  const message = error.issues[0]?.message ?? "Invalid request";
  return new AppError(400, "VALIDATION_ERROR", message);
}

lostReportsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const input = createLostReportSchema.parse(req.body);
    const report = await createLostReport(req.user!, input);
    res.status(201).json(ok({ report }));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

lostReportsRouter.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const reports = await listMyLostReports(req.user!.id);
    res.status(200).json(ok({ reports }));
  } catch (error) {
    next(error);
  }
});

lostReportsRouter.get("/", requireAuth, requireStaff, async (_req, res, next) => {
  try {
    const reports = await listLostReportsForStaff();
    res.status(200).json(ok({ reports }));
  } catch (error) {
    next(error);
  }
});

lostReportsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Report id is required");
    }
    const report = await getLostReportForViewer(req.user!, id);
    res.status(200).json(ok({ report }));
  } catch (error) {
    next(error);
  }
});

lostReportsRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Report id is required");
    }
    const input = updateLostReportSchema.parse(req.body);
    const report = await updateLostReport(req.user!, id, input);
    res.status(200).json(ok({ report }));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

lostReportsRouter.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Report id is required");
    }
    const report = await cancelLostReport(req.user!, id);
    res.status(200).json(ok({ report }));
  } catch (error) {
    next(error);
  }
});

lostReportsRouter.post("/:id/close", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Report id is required");
    }
    const report = await closeLostReport(req.user!, id);
    res.status(200).json(ok({ report }));
  } catch (error) {
    next(error);
  }
});
