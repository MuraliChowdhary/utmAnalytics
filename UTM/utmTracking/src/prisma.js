// src/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
export function getPrisma(env) {
    const adapter = new PrismaNeon({ connectionString: env.HYPERDRIVE.connectionString });
    return new PrismaClient({ adapter });
}
