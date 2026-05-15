import { Prisma } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import { getPagination } from '../../lib/pagination';
import { sanitizeObject } from '../../lib/sanitize';
import { territoryScopeMiddleware } from '../../middleware/territoryScope.middleware';
import { assertRtInScope, resolveVisibleRtIds } from '../security/security';
import { calculateFairnessScore, detectAnomalies } from './bantuan.fairness.service';

function authScope(app: FastifyInstance) {
  return [app.authenticate, territoryScopeMiddleware];
}

async function resolveFairnessRtId(req: any, reply: any): Promise<number | null> {
  const user = req.user as any;
  const q = req.query?.rtId;
  const fromQuery = q != null && String(q).trim() !== '' ? Number(q) : NaN;
  if (Number.isFinite(fromQuery) && fromQuery > 0) {
    const ok = await assertRtInScope(user, fromQuery, reply);
    if (!ok) return null;
    return fromQuery;
  }
  const jwtRt = user.rtId != null && user.rtId !== '' ? Number(user.rtId) : NaN;
  if (Number.isFinite(jwtRt) && jwtRt > 0) {
    const ok = await assertRtInScope(user, jwtRt, reply);
    if (!ok) return null;
    return jwtRt;
  }
  reply.code(400).send({ error: 'rtId wajib diisi (?rtId=) atau akun harus memiliki rtId.' });
  return null;
}

async function buildAnomalyWhere(req: any): Promise<Prisma.BantuanAnomalyWhereInput> {
  const user = req.user as any;
  const base: Prisma.BantuanAnomalyWhereInput = { status: 'open' };
  const rtIds = await resolveVisibleRtIds(user);
  const q = req.query?.rtId;
  const fromQuery = q != null && String(q).trim() !== '' ? Number(q) : NaN;

  if (rtIds === null) {
    if (Number.isFinite(fromQuery) && fromQuery > 0) {
      return { ...base, rtId: fromQuery };
    }
    return base;
  }
  if (rtIds.length === 0) {
    return { ...base, id: -1 };
  }
  if (Number.isFinite(fromQuery) && fromQuery > 0) {
    if (!rtIds.includes(fromQuery)) {
      return { ...base, id: -1 };
    }
    return { ...base, rtId: fromQuery };
  }
  return rtIds.length === 1 ? { ...base, rtId: rtIds[0] } : { ...base, rtId: { in: rtIds } };
}

async function bantuanPenerimaTerritoryWhere(user: any) {
  const rtIds = await resolveVisibleRtIds(user);
  if (rtIds === null) return {};
  if (rtIds.length === 0) return { id: -1 };
  return { OR: [{ rtId: { in: rtIds } }, { keluarga: { rtId: { in: rtIds } } }] };
}

async function keluargaTerritoryWhere(user: any) {
  const rtIds = await resolveVisibleRtIds(user);
  if (rtIds === null) return {};
  if (rtIds.length === 0) return { id: -1 };
  return { rtId: { in: rtIds } };
}

export async function bantuanRoutes(app: FastifyInstance) {
  app.get('/fairness/summary', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const rtId = await resolveFairnessRtId(req, reply);
    if (rtId == null) return;
    const fairness = await calculateFairnessScore(rtId);
    return fairness;
  });

  app.get('/fairness/anomalies', { preHandler: authScope(app) }, async (req: any) => {
    const where = await buildAnomalyWhere(req);
    const [anomalies, total] = await Promise.all([
      prisma.bantuanAnomaly.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 50,
      }),
      prisma.bantuanAnomaly.count({ where }),
    ]);
    return { anomalies, total };
  });

  app.post('/fairness/calculate', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user as any;
    if (user.role !== 'admin_pusat' && user.role !== 'admin_kota') {
      return reply.code(403).send({ error: 'Hanya admin pusat atau admin kota.' });
    }
    const raw = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const rtId = Number(raw.rtId);
    if (!Number.isFinite(rtId) || rtId <= 0) {
      return reply.code(400).send({ error: 'Body rtId wajib berupa angka positif.' });
    }
    const ok = await assertRtInScope(user, rtId, reply);
    if (!ok) return;
    const fairness = await calculateFairnessScore(rtId);
    const newAnomalies = await detectAnomalies(rtId);
    return { fairness, newAnomalies };
  });

  app.patch('/fairness/anomalies/:id/resolve', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user as any;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: 'ID tidak valid.' });
    }
    const row = await prisma.bantuanAnomaly.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ error: 'Anomali tidak ditemukan.' });
    const rtIds = await resolveVisibleRtIds(user);
    if (rtIds !== null) {
      const rid = row.rtId;
      if (rid == null || !rtIds.includes(rid)) {
        return reply.code(403).send({ error: 'Data di luar wilayah kerja Anda.' });
      }
    }
    const raw = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const { catatan } = sanitizeObject(raw, ['catatan']) as { catatan?: string };
    const prevMeta = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>;
    const updated = await prisma.bantuanAnomaly.update({
      where: { id },
      data: {
        status: 'resolved',
        metadata: {
          ...prevMeta,
          ...(catatan ? { catatan } : {}),
          resolvedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
    return updated;
  });

  app.get('/', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const { page, limit, skip } = getPagination(req.query);
    const where = {};
    const [rows, total] = await Promise.all([
      prisma.bantuan.findMany({
        where,
        include: { _count: { select: { penerima: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bantuan.count({ where }),
    ]);
    reply.header('x-total-count', String(total));
    reply.header('x-page', String(page));
    reply.header('x-limit', String(limit));
    reply.header('x-total-pages', String(Math.max(1, Math.ceil(total / limit))));
    return rows;
  });

  app.get('/fairness', { preHandler: authScope(app) }, async (req: any) => {
    const user = req.user as any;
    const pScope = await bantuanPenerimaTerritoryWhere(user);
    const kScope = await keluargaTerritoryWhere(user);

    const latestSnapshot = await (prisma as any).bantuanFairnessSnapshot.findFirst({ orderBy: { calculatedAt: 'desc' } });
    const anomalies = await (prisma as any).bantuanAnomaly.findMany({
      where: { status: 'open' },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    });
    const repeatedRecipients = await prisma.bantuanPenerima.groupBy({
      by: ['keluargaId'],
      where: { keluargaId: { not: null }, status: 'diterima', ...pScope },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 40,
    });
    const highRiskFamilies = await prisma.keluarga.findMany({
      where: { skorPrioritasBantuan: { gte: 80 }, ...kScope },
      select: { id: true, namaKepala: true, noKk: true, skorPrioritasBantuan: true, rtId: true },
    });
    const reachedFamilyIds = await prisma.bantuanPenerima.findMany({
      where: { keluargaId: { not: null }, status: 'diterima', ...pScope },
      select: { keluargaId: true },
    });
    const reached = new Set(reachedFamilyIds.map((r) => r.keluargaId).filter(Boolean));
    const uncoveredFamilies = highRiskFamilies.filter((f) => !reached.has(f.id)).slice(0, 20);
    const repeated = repeatedRecipients.filter((r) => r._count.id > 1).slice(0, 20);

    return {
      snapshot: latestSnapshot ?? {
        fairnessScore: 0,
        repeatedRecipients: repeated.length,
        uncoveredHighRisk: uncoveredFamilies.length,
      },
      repeatedRecipients: repeated,
      uncoveredFamilies,
      anomalies,
    };
  });

  app.post('/', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const raw = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const b = sanitizeObject(raw, ['nama', 'tipe', 'deskripsi', 'sumber', 'satuan']) as any;
    const created = await prisma.bantuan.create({
      data: {
        nama: b.nama,
        tipe: b.tipe,
        deskripsi: b.deskripsi,
        satuan: b.satuan || 'paket',
        nilaiPerSatuan: Number(b.nilaiPerSatuan) || 0,
        stokTotal: Number(b.stokTotal) || 0,
        stokTersisa: Number(b.stokTotal) || 0,
        sumber: b.sumber,
      },
    });
    return reply.code(201).send(created);
  });

  app.get('/penerima', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user as any;
    const bantuanId = req.query.bantuanId;
    const pScope = await bantuanPenerimaTerritoryWhere(user);
    const { page, limit, skip } = getPagination(req.query);
    const where: any = { ...(bantuanId ? { bantuanId: Number(bantuanId) } : {}), ...pScope };
    const [rows, total] = await Promise.all([
      prisma.bantuanPenerima.findMany({
        where,
        include: { bantuan: true, keluarga: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bantuanPenerima.count({ where }),
    ]);
    reply.header('x-total-count', String(total));
    reply.header('x-page', String(page));
    reply.header('x-limit', String(limit));
    reply.header('x-total-pages', String(Math.max(1, Math.ceil(total / limit))));
    return rows;
  });

  app.post('/penerima', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user as any;
    const raw = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const b = sanitizeObject(raw, ['namaPenerima', 'catatan']) as any;
    const rtId = b.rtId != null ? Number(b.rtId) : null;
    if (rtId) {
      const ok = await assertRtInScope(user, rtId, reply);
      if (!ok) return;
    }
    const p = await prisma.bantuanPenerima.create({
      data: {
        bantuanId: Number(b.bantuanId),
        namaPenerima: b.namaPenerima,
        rtId,
        jumlahDiterima: Number(b.jumlahDiterima),
        keluargaId: b.keluargaId,
        catatan: b.catatan || undefined,
      },
    });
    await prisma.bantuan.update({
      where: { id: Number(b.bantuanId) },
      data: { stokTersisa: { decrement: Number(b.jumlahDiterima) } },
    });
    return reply.code(201).send(p);
  });

  app.patch('/penerima/:id/status', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user as any;
    const id = Number(req.params.id);
    const row = await prisma.bantuanPenerima.findUnique({ where: { id }, include: { keluarga: true } });
    if (!row) return reply.code(404).send({ error: 'Penerima tidak ditemukan' });
    const rtIds = await resolveVisibleRtIds(user);
    if (rtIds !== null) {
      const rt = row.rtId ?? row.keluarga?.rtId;
      if (rt == null || !rtIds.includes(rt)) {
        return reply.code(403).send({ error: 'Data di luar wilayah kerja Anda.' });
      }
    }
    const { status } = req.body;
    return prisma.bantuanPenerima.update({
      where: { id },
      data: { status, tanggalDiterima: status === 'diterima' ? new Date() : undefined },
    });
  });
}
