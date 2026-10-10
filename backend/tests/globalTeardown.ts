import { PrismaClient } from "@prisma/client";

export default async function globalTeardown(): Promise<void> {
  const client = new PrismaClient();
  await client.$disconnect();
}
