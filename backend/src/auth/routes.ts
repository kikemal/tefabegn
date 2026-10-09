import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth, requireStaff } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { ok } from "../types/api";
import { getUserById, loginUser, logoutSession, refreshSession, registerUser } from "./service";
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from "./validation";

export const authRouter = Router();

function validationError(error: ZodError): AppError {
  const message = error.issues[0]?.message ?? "Invalid request";
  return new AppError(400, "VALIDATION_ERROR", message);
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await registerUser(input);
    res.status(201).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);
    res.status(200).json(ok(result));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const input = refreshSchema.parse(req.body);
    const tokens = await refreshSession(input.refreshToken);
    res.status(200).json(ok({ tokens }));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const input = logoutSchema.parse(req.body);
    await logoutSession(input.refreshToken);
    res.status(200).json(ok({ loggedOut: true }));
  } catch (error) {
    if (error instanceof ZodError) {
      next(validationError(error));
      return;
    }
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.user!.id);
    res.status(200).json(ok({ user }));
  } catch (error) {
    next(error);
  }
});

authRouter.get("/staff/ping", requireAuth, requireStaff, (_req, res) => {
  res.status(200).json(
    ok({
      staff: true,
      message: "Staff access confirmed",
    }),
  );
});
