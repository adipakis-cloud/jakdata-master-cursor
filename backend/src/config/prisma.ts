import { PrismaClient } from '@prisma/client';
import { withPrismaPoolParams } from './dbUrl';

const raw = process.env.DATABASE_URL;
const limit = Number(process.env.PRISMA_CONNECTION_LIMIT ?? 5);
const poolTimeout = Number(process.env.PRISMA_POOL_TIMEOUT ?? 60);

const prismaOptions =
  raw && !/^1|true|yes$/i.test(String(process.env.PRISMA_DISABLE_POOL_PARAMS ?? ''))
    ? {
        datasources: {
          db: {
            url: withPrismaPoolParams(raw, {
              connectionLimit: Number.isFinite(limit) && limit > 0 ? limit : 5,
              poolTimeoutSec: Number.isFinite(poolTimeout) && poolTimeout > 0 ? poolTimeout : 60,
              suggestPgBouncer: true,
            }),
          },
        },
      }
    : undefined;

export const prisma = new PrismaClient(prismaOptions as any);

export default prisma;
