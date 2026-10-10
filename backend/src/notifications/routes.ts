import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { ok } from "../types/api";
import {
  countUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./service";
import { listNotificationsQuerySchema } from "./validation";

export const notificationsRouter = Router();

function validationError(error: ZodError): AppError {
  const message = error.issues[0]?.message ?? "Invalid request";
  return new AppError(400, "VALIDATION_ERROR", message);
}

notificationsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const query = listNotificationsQuerySchema.parse(req.query);
    const notifications = await listMyNotifications(req.user!.id, query);
    res.status(200).json(ok({ notifications }));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

notificationsRouter.get("/unread-count", requireAuth, async (req, res, next) => {
  try {
    const unreadCount = await countUnreadNotifications(req.user!.id);
    res.status(200).json(ok({ unreadCount }));
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/read-all", requireAuth, async (req, res, next) => {
  try {
    const result = await markAllNotificationsRead(req.user!.id);
    res.status(200).json(ok(result));
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError(400, "VALIDATION_ERROR", "Notification id is required");
    }
    const notification = await markNotificationRead(req.user!.id, id);
    res.status(200).json(ok({ notification }));
  } catch (error) {
    next(error);
  }
});
