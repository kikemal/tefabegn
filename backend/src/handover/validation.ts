import { z } from "zod";

export const confirmReturnSchema = z
  .object({
    notes: z.string().trim().max(4000).optional(),
    returnedAt: z.string().datetime().optional(),
  })
  .strict();

export type ConfirmReturnInput = z.infer<typeof confirmReturnSchema>;

export const confirmReceiptSchema = z
  .object({
    notes: z.string().trim().max(4000).optional(),
  })
  .strict();

export type ConfirmReceiptInput = z.infer<typeof confirmReceiptSchema>;

export const closeCaseSchema = z
  .object({
    notes: z.string().trim().max(4000).optional(),
  })
  .strict();

export type CloseCaseInput = z.infer<typeof closeCaseSchema>;
