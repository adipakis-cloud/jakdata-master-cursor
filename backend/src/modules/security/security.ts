import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/prisma';

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
  if (role === 'koordinator_kecamatan') {
    filter.kecamatanId = user.kecamatanId;
    return filter;
  }
  if (role === 'koordinator_kelurahan') {
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

const UNSCOPED_ROLES = ['admin_pusat', 'auditor', 'finance_admin'];
const NO_MATCH_ID = -1;

function isUnscopedRole(role: string) {
  return UNSCOPED_ROLES.includes(role);
}

export function getRtScopeWhere(user: any) {
  const role = user?.role;
  if (isUnscopedRole(role)) return {};
  if (role === 'koordinator_kecamatan') {
    return user.kecamatanId ? { rw: { kelurahan: { kecamatanId: user.kecamatanId } } } : { id: NO_MATCH_ID };
  }
  if (role === 'koordinator_kelurahan') {
    return user.kelurahanId ? { rw: { kelurahanId: user.kelurahanId } } : { id: NO_MATCH_ID };
  }
  if (role === 'koordinator_rw') {
    return user.rwId ? { rwId: user.rwId } : { id: NO_MATCH_ID };
  }
  if (role === 'koordinator_rt' || role === 'petugas_lapangan') {
    return user.rtId ? { id: user.rtId } : { id: NO_MATCH_ID };
  }
  return {};
}

export function getResidentScopeWhere(user: any) {
  const rtWhere = getRtScopeWhere(user);
  if (Object.keys(rtWhere).length === 0) return {};
  if (typeof rtWhere.id === 'number') return { rtId: rtWhere.id };
  return { rt: rtWhere };
}

export function getLaporanScopeWhere(user: any) {
  const role = user?.role;
  if (isUnscopedRole(role)) return {};
  if (role === 'koordinator_kecamatan') {
    if (!user.kecamatanId) return { id: NO_MATCH_ID };
    return {
      OR: [
        { kecamatanId: user.kecamatanId },
        { kelurahan: { kecamatanId: user.kecamatanId } },
        { rt: { rw: { kelurahan: { kecamatanId: user.kecamatanId } } } },
      ],
    };
  }
  if (role === 'koordinator_kelurahan') {
    if (!user.kelurahanId) return { id: NO_MATCH_ID };
    return {
      OR: [
        { kelurahanId: user.kelurahanId },
        { rt: { rw: { kelurahanId: user.kelurahanId } } },
      ],
    };
  }
  if (role === 'koordinator_rw') {
    return user.rwId ? { rt: { rwId: user.rwId } } : { id: NO_MATCH_ID };
  }
  if (role === 'koordinator_rt' || role === 'petugas_lapangan') {
    return user.rtId ? { rtId: user.rtId } : { id: NO_MATCH_ID };
  }
  return {};
}

export function getWarmindoScopeWhere(user: any) {
  const role = user?.role;
  if (isUnscopedRole(role)) return {};
  if (role === 'manager_warmindo' || role === 'kasir_warmindo') {
    return user.warmindoId ? { id: user.warmindoId } : { id: NO_MATCH_ID };
  }
  if (role === 'koordinator_kecamatan') {
    if (!user.kecamatanId) return { id: NO_MATCH_ID };
    return {
      OR: [
        { kelurahan: { kecamatanId: user.kecamatanId } },
        { rt: { rw: { kelurahan: { kecamatanId: user.kecamatanId } } } },
      ],
    };
  }
  if (role === 'koordinator_kelurahan') {
    if (!user.kelurahanId) return { id: NO_MATCH_ID };
    return {
      OR: [
        { kelurahanId: user.kelurahanId },
        { rt: { rw: { kelurahanId: user.kelurahanId } } },
      ],
    };
  }
  if (role === 'koordinator_rw') {
    return user.rwId ? { rt: { rwId: user.rwId } } : { id: NO_MATCH_ID };
  }
  if (role === 'koordinator_rt' || role === 'petugas_lapangan') {
    return user.rtId ? { rtId: user.rtId } : { id: NO_MATCH_ID };
  }
  return {};
}

// ── PHONE MASKING ─────────────────────────────────────────────────
export function maskPhone(phone: string | null | undefined, role: string): string | null {
  if (!phone) return null;
  // Admin pusat, auditor, koordinator kelurahan ke atas bisa lihat full
  const fullAccessRoles = ['admin_pusat', 'auditor', 'koordinator_kecamatan', 'koordinator_kelurahan'];
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
