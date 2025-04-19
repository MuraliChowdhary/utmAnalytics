// src/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

export interface Env {
  HYPERDRIVE: {
    connectionString: string;
  };
}

export function getPrisma(env: Env) {
  const adapter = new PrismaNeon({ connectionString: env.HYPERDRIVE.connectionString });
  return new PrismaClient({ adapter });
}