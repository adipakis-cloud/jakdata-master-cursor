import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/prisma';

/** JWT/session fields used for RT territory resolution (matches User territory FKs). */
export type TerritoryScopeUser = {
  role: string;
  rtId?: number | null;
  rwId?: number | null;
  kelurahanId?: number | null;
  kecamatanId?: number | null;
  kotaId?: number | null;
};

/** Mobile-first field operation (coordinator + petugas). */
export const MOBILE_FIELD_ROLES = [
  'koordinator_kecamatan',
  'koordinator_kelurahan',
  'koordinator_rw',
  'koordinator_rt',
  'petugas_lapangan',
] as const;

export const GOVERNANCE_READ_ROLES = ['admin_pusat', 'auditor', 'finance_admin'] as const;

export function isMobileFieldRole(role: string): boolean {
  return (MOBILE_FIELD_ROLES as readonly string[]).includes(role);
}

export function canAccessKoordinatorMobileApi(role: string): boolean {
  return role === 'admin_pusat' || role === 'auditor' || isMobileFieldRole(role);
}

/** Who may triage / update status / internal notes on laporan */
export function canManageLaporan(role: string): boolean {
  return role === 'admin_pusat' || isMobileFieldRole(role);
}

/**
 * RT IDs under this user's territory (empty = none).
 * `null` = no restriction (governance laptop roles).
 */
export async function resolveVisibleRtIds(user: TerritoryScopeUser): Promise<number[] | null> {
  const { role } = user;
  if (role === 'admin_pusat' || role === 'auditor' || role === 'finance_admin') return null;

  if (role === 'koordinator_rt' || role === 'petugas_lapangan') {
    return user.rtId ? [user.rtId] : [];
  }
  if (role === 'koordinator_rw' && user.rwId) {
    const rts = await prisma.rT.findMany({ where: { rwId: user.rwId }, select: { id: true } });
    return rts.map((r) => r.id);
  }
  if (role === 'koordinator_kelurahan' && user.kelurahanId) {
    const rts = await prisma.rT.findMany({
      where: { rw: { kelurahanId: user.kelurahanId } },
      select: { id: true },
    });
    return rts.map((r) => r.id);
  }
  if (role === 'koordinator_kecamatan' && user.kecamatanId) {
    const rts = await prisma.rT.findMany({
      where: { rw: { kelurahan: { kecamatanId: user.kecamatanId } } },
      select: { id: true },
    });
    return rts.map((r) => r.id);
  }
  if (role === 'admin_kota' && user.kotaId) {
    const rts = await prisma.rT.findMany({
      where: { rw: { kelurahan: { kecamatan: { kotaId: user.kotaId } } } },
      select: { id: true },
    });
    return rts.map((r) => r.id);
  }
  if (role === 'admin_kecamatan' && user.kecamatanId) {
    const rts = await prisma.rT.findMany({
      where: { rw: { kelurahan: { kecamatanId: user.kecamatanId } } },
      select: { id: true },
    });
    return rts.map((r) => r.id);
  }
  if (role === 'admin_kelurahan' && user.kelurahanId) {
    const rts = await prisma.rT.findMany({
      where: { rw: { kelurahanId: user.kelurahanId } },
      select: { id: true },
    });
    return rts.map((r) => r.id);
  }
  if (role === 'manager_warmindo' || role === 'kasir_warmindo') return [];
  return [];
}

export async function assertRtInScope(user: TerritoryScopeUser, rtId: number, reply: FastifyReply): Promise<boolean> {
  const ids = await resolveVisibleRtIds(user);
  if (ids === null) return true;
  if (ids.length === 0 || !ids.includes(rtId)) {
    reply.code(403).send({ error: 'RT di luar wilayah kerja Anda.' });
    return false;
  }
  return true;
}

/** Laporan visible to this user (null = not found / no access). */
export async function findLaporanInScope(user: any, id: number) {
  const row = await prisma.laporanWarga.findUnique({ where: { id } });
  if (!row) return null;
  if (user.role === 'admin_pusat' || user.role === 'auditor' || user.role === 'finance_admin') return row;

  const rtIds = await resolveVisibleRtIds(user);
  if (rtIds === null) return row;
  if (row.rtId && rtIds.includes(row.rtId)) return row;
  if (user.kelurahanId && row.kelurahanId === user.kelurahanId) return row;
  if (user.kecamatanId && row.kecamatanId === user.kecamatanId) return row;
  return null;
}

/** Prisma `where` for listing laporan under this user's territory. */
export async function buildLaporanListWhere(user: any): Promise<any> {
  const rtIds = await resolveVisibleRtIds(user);
  if (rtIds === null) return {};
  if (rtIds.length === 0) return { id: -1 };
  return {
    OR: [
      { rtId: { in: rtIds } },
      ...(user.kelurahanId ? [{ kelurahanId: user.kelurahanId }] : []),
      ...(user.kecamatanId ? [{ kecamatanId: user.kecamatanId }] : []),
    ],
  };
}

/** Rows keyed by `wilayahLevel` + `wilayahId` (alerts, stress signals, etc.). */
export async function buildWilayahKeyedListWhere(user: any): Promise<any> {
  const rtIds = await resolveVisibleRtIds(user);
  if (rtIds === null) return {};
  if (rtIds.length === 0) return { id: -1 };
  const clauses: any[] = [{ wilayahLevel: 'rt', wilayahId: { in: rtIds } }];
  if (user.kelurahanId) clauses.push({ wilayahLevel: 'kelurahan', wilayahId: user.kelurahanId });
  if (user.kecamatanId) clauses.push({ wilayahLevel: 'kecamatan', wilayahId: user.kecamatanId });
  if (user.kotaId) clauses.push({ wilayahLevel: 'kota', wilayahId: user.kotaId });
  return { OR: clauses };
}

export const buildOperationalAlertListWhere = buildWilayahKeyedListWhere;

export async function buildWargaListWhere(user: any): Promise<any> {
  const rtIds = await resolveVisibleRtIds(user);
  if (rtIds === null) return {};
  if (rtIds.length === 0) return { id: -1 };
  return { rtId: { in: rtIds } };
}

export async function findWargaInScope(user: any, id: number) {
  const row = await prisma.warga.findUnique({ where: { id } });
  if (!row) return null;
  const rtIds = await resolveVisibleRtIds(user);
  if (rtIds === null) return row;
  if (rtIds.includes(row.rtId)) return row;
  return null;
}

// ── BRUTE FORCE PROTECTION ────────────────────────────────────────
// In-memory rate limit map (use Redis in production)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function checkLoginRateLimit(ip: string, email: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `${ip}::${email}`;
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_ATTEMPTS) {
      return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
  } else if (!entry || now >= entry.resetAt) {
    loginAttempts.set(key, { count: 0, resetAt: now + LOCK_MINUTES * 60 * 1000 });
  }
  return { allowed: true };
}

export function recordFailedLogin(ip: string, email: string) {
  const key = `${ip}::${email}`;
  const entry = loginAttempts.get(key);
  if (entry) entry.count++;
}

export function clearLoginAttempts(ip: string, email: string) {
  loginAttempts.delete(`${ip}::${email}`);
}

// ── TERRITORY ACCESS CONTROL ──────────────────────────────────────
export function getTerritoryFilter(user: any) {
  const role = user.role;
  const filter: any = {};

  if (role === 'admin_pusat' || role === 'auditor' || role === 'finance_admin') {
    return filter; // Semua wilayah
  }
  if (role === 'admin_kota') {
    filter.kotaId = user.kotaId;
    return filter;
  }
  if (role === 'admin_kecamatan' || role === 'koordinator_kecamatan') {
    filter.kecamatanId = user.kecamatanId;
    return filter;
  }
  if (role === 'admin_kelurahan' || role === 'koordinator_kelurahan') {
    filter.kelurahanId = user.kelurahanId;
    return filter;
  }
  if (role === 'koordinator_rw') {
    filter.rwId = user.rwId;
    return filter;
  }
  if (role === 'koordinator_rt' || role === 'petugas_lapangan') {
    filter.rtId = user.rtId;
    return filter;
  }
  if (role === 'manager_warmindo' || role === 'kasir_warmindo') {
    filter.warmindoId = user.warmindoId;
    return filter;
  }
  return filter;
}

// ── PHONE MASKING ─────────────────────────────────────────────────
export function maskPhone(phone: string | null | undefined, role: string): string | null {
  if (!phone) return null;
  // Admin pusat, auditor, koordinator kelurahan ke atas bisa lihat full
  const fullAccessRoles = [
    'admin_pusat',
    'auditor',
    'finance_admin',
    'koordinator_kecamatan',
    'koordinator_kelurahan',
    'koordinator_rw',
    'koordinator_rt',
  ];
  if (fullAccessRoles.includes(role)) return phone;
  // Sembunyikan sebagian: 0812****5678
  if (phone.length >= 8) {
    return phone.slice(0, 4) + '****' + phone.slice(-4);
  }
  return '****';
}

// ── AUDIT LOG ─────────────────────────────────────────────────────
export async function writeAuditLog(params: {
  userId?: number;
  action: string;
  entityType?: string;
  entityId?: number;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

// ── FASTIFY SECURITY PLUGIN ───────────────────────────────────────
export async function securityPlugin(app: FastifyInstance) {
  // Add security headers manually (no @fastify/helmet needed)
  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  });

  // Global rate limit: max 200 req/min per IP
  const requestCounts = new Map<string, { count: number; resetAt: number }>();
  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = requestCounts.get(ip);

    if (!entry || now >= entry.resetAt) {
      requestCounts.set(ip, { count: 1, resetAt: now + 60000 });
    } else {
      entry.count++;
      if (entry.count > 200) {
        return reply.code(429).send({ error: 'Too many requests. Coba lagi dalam 1 menit.' });
      }
    }
  });
}
