import { z } from "zod";

export const generateMatchesSchema = z
  .object({
    lostReportId: z.string().trim().min(1).optional(),
    foundReportId: z.string().trim().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()
  .refine((value) => Boolean(value.lostReportId || value.foundReportId), {
    message: "Provide lostReportId and/or foundReportId",
  });

export type GenerateMatchesInput = z.infer<typeof generateMatchesSchema>;

export const listMatchesQuerySchema = z
  .object({
    lostReportId: z.string().trim().min(1).optional(),
    foundReportId: z.string().trim().min(1).optional(),
  })
  .strict();

export type ListMatchesQuery = z.infer<typeof listMatchesQuerySchema>;
