import { z } from "zod";

export const createClaimSchema = z
  .object({
    foundReportId: z.string().trim().min(1).optional(),
    matchId: z.string().trim().min(1).optional(),
    message: z.string().trim().min(1).max(2000),
    evidence: z.string().trim().min(1).max(4000),
    proofRef: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
  })
  .strict()
  .refine((value) => Boolean(value.foundReportId || value.matchId), {
    message: "Provide foundReportId and/or matchId",
  });

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
