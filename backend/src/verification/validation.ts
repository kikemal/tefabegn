import { z } from "zod";

export const verificationAssessmentSchema = z.enum(["CONSISTENT", "INCONSISTENT", "UNCLEAR"]);

export const recordVerificationAttemptSchema = z
  .object({
    assessment: verificationAssessmentSchema,
    notes: z.string().trim().min(1).max(4000),
    /** Moves claim to NEEDS_MORE_INFO. Never auto-approves. */
    requestMoreInfo: z.boolean().optional().default(false),
  })
  .strict();

export type RecordVerificationAttemptInput = z.infer<typeof recordVerificationAttemptSchema>;
