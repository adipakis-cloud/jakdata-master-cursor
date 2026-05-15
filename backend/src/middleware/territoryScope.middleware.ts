import type { FastifyReply, FastifyRequest } from 'fastify';
import { buildLaporanListWhere, buildWargaListWhere } from '../modules/security/security';

const GOVERNANCE_GLOBAL = new Set(['admin_pusat', 'auditor', 'finance_admin']);
const WARMINDO_ROLES = new Set(['manager_warmindo', 'kasir_warmindo']);

/**
 * After JWT `authenticate`. Sets:
 * - `scopeFilter`: `null` = governance (no territory restriction); `{ warmindoId }` for warmindo staff;
 *   `{ territory: { rtId?, rwId?, ... } }` for other accounts (metadata — do not spread onto all models).
 * - `territoryPrisma`: `{ warga, laporan }` Prisma `where` fragments for list queries (authoritative filter).
 */
export async function territoryScopeMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const user = (req as any).user as Record<string, unknown> | undefined;
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });

  const role = String(user.role ?? '');

  if (GOVERNANCE_GLOBAL.has(role)) {
    (req as any).scopeFilter = null;
    (req as any).territoryPrisma = null;
    return;
  }

  if (WARMINDO_ROLES.has(role)) {
    const wid = user.warmindoId;
    if (wid == null || wid === '' || Number(wid) <= 0) {
      return reply.code(403).send({ error: 'Akun warmindo tidak memiliki outlet yang terdefinisi.' });
    }
    (req as any).scopeFilter = { warmindoId: Number(wid) };
    (req as any).territoryPrisma = {
      warga: await buildWargaListWhere(user),
      laporan: await buildLaporanListWhere(user),
    };
    return;
  }

  const wargaWhere = await buildWargaListWhere(user);
  if (wargaWhere && typeof wargaWhere === 'object' && 'id' in wargaWhere && (wargaWhere as any).id === -1) {
    return reply.code(403).send({
      error: 'Akun ini tidak memiliki wilayah yang terdefinisi. Hubungi admin.',
    });
  }

  const territory: Record<string, number> = {};
  if (user.rtId != null && user.rtId !== '') territory.rtId = Number(user.rtId);
  else if (user.rwId != null && user.rwId !== '') territory.rwId = Number(user.rwId);
  else if (user.kelurahanId != null && user.kelurahanId !== '') territory.kelurahanId = Number(user.kelurahanId);
  else if (user.kecamatanId != null && user.kecamatanId !== '') territory.kecamatanId = Number(user.kecamatanId);
  else if (user.kotaId != null && user.kotaId !== '') territory.kotaId = Number(user.kotaId);

  if (Object.keys(territory).length === 0) {
    return reply.code(403).send({
      error: 'Akun ini tidak memiliki wilayah yang terdefinisi. Hubungi admin.',
    });
  }

  (req as any).scopeFilter = { territory };
  (req as any).territoryPrisma = {
    warga: wargaWhere,
    laporan: await buildLaporanListWhere(user),
  };
}
