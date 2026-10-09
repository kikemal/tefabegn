import { z } from "zod";
import { REPORT_CATEGORIES } from "../categories";

const categorySchema = z.enum(REPORT_CATEGORIES);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const createLostReportSchema = z
  .object({
    category: categorySchema,
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(4000),
    location: z.string().trim().min(1).max(200),
    lostAt: z.coerce.date().optional(),
    identifier: optionalText(120),
    privateDetails: optionalText(4000),
    imageRef: optionalText(500),
  })
  .strict();

export const updateLostReportSchema = z
  .object({
    category: categorySchema.optional(),
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().min(1).max(4000).optional(),
    location: z.string().trim().min(1).max(200).optional(),
    lostAt: z.coerce.date().nullable().optional(),
    identifier: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional()
      .transform((value) => (value === "" ? null : value)),
    privateDetails: z
      .string()
      .trim()
      .max(4000)
      .nullable()
      .optional()
      .transform((value) => (value === "" ? null : value)),
    imageRef: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional()
      .transform((value) => (value === "" ? null : value)),
  })
  .strict()
  .refine(
    (value) =>
      value.category !== undefined ||
      value.title !== undefined ||
      value.description !== undefined ||
      value.location !== undefined ||
      value.lostAt !== undefined ||
      value.identifier !== undefined ||
      value.privateDetails !== undefined ||
      value.imageRef !== undefined,
    { message: "At least one field is required" },
  );

export type CreateLostReportInput = z.infer<typeof createLostReportSchema>;
export type UpdateLostReportInput = z.infer<typeof updateLostReportSchema>;
