import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth, requireStaff } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";
import { ok } from "../../types/api";
import {
  cancelFoundReport,
  closeFoundReport,
  createFoundReport,
  getFoundReportForViewer,
  listFoundReportsForStaff,
  listMyFoundReports,
  updateFoundReport,
} from "./service";
import { createFoundReportSchema, updateFoundReportSchema } from "./validation";

export const foundReportsRouter = Router();

function validationError(error: ZodError): AppError {
  const message = error.issues[0]?.message ?? "Invalid request";
  return new AppError(400, "VALIDATION_ERROR", message);
}

foundReportsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const input = createFoundReportSchema.parse(req.body);
    const report = await createFoundReport(req.user!, input);
    res.status(201).json(ok({ report }));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

foundReportsRouter.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const reports = await listMyFoundReports(req.user!.id);
    res.status(200).json(ok({ reports }));
  } catch (error) {
    next(error);
  }
});

foundReportsRouter.get("/", requireAuth, requireStaff, async (_req, res, next) => {
  try {
    const reports = await listFoundReportsForStaff();
    res.status(200).json(ok({ reports }));
  } catch (error) {
    next(error);
  }
});

foundReportsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Report id is required");
    }
    const report = await getFoundReportForViewer(req.user!, id);
    res.status(200).json(ok({ report }));
  } catch (error) {
    next(error);
  }
});

foundReportsRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Report id is required");
    }
    const input = updateFoundReportSchema.parse(req.body);
    const report = await updateFoundReport(req.user!, id, input);
    res.status(200).json(ok({ report }));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

foundReportsRouter.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Report id is required");
    }
    const report = await cancelFoundReport(req.user!, id);
    res.status(200).json(ok({ report }));
  } catch (error) {
    next(error);
  }
});

foundReportsRouter.post("/:id/close", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Report id is required");
    }
    const report = await closeFoundReport(req.user!, id);
    res.status(200).json(ok({ report }));
  } catch (error) {
    next(error);
  }
});
