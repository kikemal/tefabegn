import { z } from "zod";

export const updateOwnProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required").max(120).optional(),
    email: z
      .string()
      .trim()
      .email()
      .max(255)
      .transform((value) => value.toLowerCase())
      .optional(),
  })
  .strict()
  .refine((value) => value.fullName !== undefined || value.email !== undefined, {
    message: "At least one permitted field (fullName or email) is required",
  });

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
