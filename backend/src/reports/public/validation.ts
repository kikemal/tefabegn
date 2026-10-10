import { z } from "zod";

export const recentFoundQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(20).optional().default(8),
  })
  .strict();

export type RecentFoundQuery = z.infer<typeof recentFoundQuerySchema>;
