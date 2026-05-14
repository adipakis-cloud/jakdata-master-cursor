import { prisma } from '../../config/prisma';

export async function scopedRtIds(user: any): Promise<number[] | null> {
  if (!user || ['admin_pusat', 'auditor', 'finance_admin'].includes(user.role)) return null;
  if (user.rtId) return [user.rtId];
  if (user.rwId) {
    const rts = await prisma.rT.findMany({ where: { rwId: user.rwId }, select: { id: true } });
    return rts.map(rt => rt.id);
  }
  if (user.kelurahanId) {
    const rts = await prisma.rT.findMany({ where: { rw: { kelurahanId: user.kelurahanId } }, select: { id: true } });
    return rts.map(rt => rt.id);
  }
  if (user.kecamatanId) {
    const rts = await prisma.rT.findMany({ where: { rw: { kelurahan: { kecamatanId: user.kecamatanId } } }, select: { id: true } });
    return rts.map(rt => rt.id);
  }
  if (user.kotaId) {
    const rts = await prisma.rT.findMany({ where: { rw: { kelurahan: { kecamatan: { kotaId: user.kotaId } } } }, select: { id: true } });
    return rts.map(rt => rt.id);
  }
  return [];
}

export async function assertRtAccess(user: any, rtId: number) {
  const rtIds = await scopedRtIds(user);
  if (rtIds === null) return;
  if (!rtIds.includes(rtId)) {
    const error: any = new Error('Akses wilayah ditolak');
    error.statusCode = 403;
    throw error;
  }
}

export async function warmindoWhereForUser(user: any) {
  if (!user || ['admin_pusat', 'auditor', 'finance_admin'].includes(user.role)) return {};
  if (['manager_warmindo', 'kasir_warmindo'].includes(user.role)) {
    return user.warmindoId ? { id: user.warmindoId } : { id: -1 };
  }
  const rtIds = await scopedRtIds(user);
  if (rtIds === null) return {};
  return { rtId: { in: rtIds } };
}

export async function assertWarmindoAccess(user: any, warmindoId: number) {
  const where = await warmindoWhereForUser(user);
  const count = await prisma.warmindoOutlet.count({ where: { AND: [where, { id: warmindoId }] } });
  if (count === 0) {
    const error: any = new Error('Akses outlet ditolak');
    error.statusCode = 403;
    throw error;
  }
}

export function fieldEvidenceDefaults(user: any) {
  return {
    userId: user?.sub ?? null,
    rtId: user?.rtId ?? null,
    rwId: user?.rwId ?? null,
    kelurahanId: user?.kelurahanId ?? null,
    warmindoId: user?.warmindoId ?? null,
  };
}
