import type { FastifyReply } from 'fastify';
import { prisma } from '../../config/prisma';
import {
  assertRtInScope,
  buildWargaListWhere,
  resolveVisibleRtIds,
} from './security';

export { buildLaporanListWhere as buildLaporanTerritoryWhere } from './security';
export { buildWilayahKeyedListWhere, buildOperationalAlertListWhere } from './security';

export type UserTerritoryScope =
  | { mode: 'all' }
  | { mode: 'none' }
  | { mode: 'rt_in'; rtIds: number[]; kelurahanId?: number | null; kecamatanId?: number | null; kotaId?: number | null };

/** Structured scope for RBAC / filtering (RT-first; governance = all). */
export async function getUserTerritoryScope(user: any): Promise<UserTerritoryScope> {
  const rtIds = await resolveVisibleRtIds(user);
  if (rtIds === null) return { mode: 'all' };
  if (rtIds.length === 0) return { mode: 'none' };
  return {
    mode: 'rt_in',
    rtIds,
    kelurahanId: user.kelurahanId ?? null,
    kecamatanId: user.kecamatanId ?? null,
    kotaId: user.kotaId ?? null,
  };
}

/** Default Prisma `where` fragment for rows keyed by `rtId` (warga, keluarga penerima, etc.). */
export async function buildTerritoryWhere(user: any) {
  return buildWargaListWhere(user);
}

export async function assertCanAccessTerritory(
  user: any,
  ctx: { rtId?: number | null; kelurahanId?: number | null },
  reply: FastifyReply,
): Promise<boolean> {
  if (!user) {
    reply.code(401).send({ error: 'Unauthorized' });
    return false;
  }
  if (user.role === 'admin_pusat' || user.role === 'auditor' || user.role === 'finance_admin') return true;

  if (ctx.rtId != null && ctx.rtId > 0) {
    return assertRtInScope(user, ctx.rtId, reply);
  }

  if (ctx.kelurahanId != null && ctx.kelurahanId > 0) {
    if (user.kelurahanId && ctx.kelurahanId === user.kelurahanId) return true;
    if (user.kecamatanId) {
      const kel = await prisma.kelurahan.findFirst({
        where: { id: ctx.kelurahanId, kecamatanId: user.kecamatanId },
      });
      if (kel) return true;
    }
    if (user.kotaId) {
      const kel = await prisma.kelurahan.findFirst({
        where: { id: ctx.kelurahanId, kecamatan: { kotaId: user.kotaId } },
      });
      if (kel) return true;
    }
    reply.code(403).send({ error: 'Kelurahan di luar wilayah kerja Anda.' });
    return false;
  }

  return true;
}

/** Merge an existing Prisma `where` with territory filter (AND). */
export function applyTerritoryFilter(where: Record<string, unknown>, territoryWhere: Record<string, unknown>) {
  if (!territoryWhere || Object.keys(territoryWhere).length === 0) return where;
  return { AND: [where, territoryWhere] };
}
