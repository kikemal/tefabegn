import { z } from "zod";

export const staffClaimDecisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT", "REQUEST_MORE_INFO"]),
    notes: z.string().trim().min(1).max(4000),
  })
  .strict();

export type StaffClaimDecisionInput = z.infer<typeof staffClaimDecisionSchema>;

export const readyForHandoverSchema = z
  .object({
    notes: z.string().trim().max(4000).optional(),
  })
  .strict();

export type ReadyForHandoverInput = z.infer<typeof readyForHandoverSchema>;
