import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import path from 'path';
import fs from 'fs';
import { getPagination } from '../../lib/pagination';
import { sanitizeObject } from '../../lib/sanitize';
import { territoryScopeMiddleware } from '../../middleware/territoryScope.middleware';
import {
  assertRtInScope,
  buildLaporanListWhere,
  canManageLaporan,
  findLaporanInScope,
} from '../security/security';

function authScope(app: FastifyInstance) {
  return [app.authenticate, territoryScopeMiddleware];
}

export async function laporanRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authScope(app) }, async (req) => {
    const user = req.user as any;
    const { status, urgency, kategori } = req.query as any;
    const { page, limit, skip } = getPagination(req.query as any);
    const scope = (req as any).territoryPrisma?.laporan ?? (await buildLaporanListWhere(user));
    const where: any = { AND: [scope] };
    if (status) where.AND.push({ status });
    if (urgency) where.AND.push({ urgencyLevel: urgency });
    if (kategori) where.AND.push({ kategori });

    const [data, total] = await Promise.all([
      prisma.laporanWarga.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isEmergency: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.laporanWarga.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { data, total, page, limit, totalPages };
  });

  app.post('/', { preHandler: authScope(app) }, async (req, reply) => {
    const user = req.user as any;
    const raw = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const body = sanitizeObject(raw, [
      'isiLaporan',
      'kategori',
      'lokasiText',
      'namaPelapor',
      'noHpPelapor',
      'subkategori',
      'channelType',
    ]) as any;
    if (!body.isiLaporan || !body.kategori) return reply.code(400).send({ error: 'Isi laporan dan kategori wajib' });

    const rtId = body.rtId != null && body.rtId !== '' ? +body.rtId : user.rtId != null ? +user.rtId : null;
    if (rtId != null) {
      const ok = await assertRtInScope(user, rtId, reply);
      if (!ok) return;
    }

    let kelurahanId =
      body.kelurahanId != null && body.kelurahanId !== '' ? +body.kelurahanId : user.kelurahanId != null ? +user.kelurahanId : null;
    let kecamatanId =
      body.kecamatanId != null && body.kecamatanId !== '' ? +body.kecamatanId : user.kecamatanId != null ? +user.kecamatanId : null;

    if (rtId != null) {
      const rtRow = await prisma.rT.findUnique({
        where: { id: rtId },
        select: { rw: { select: { kelurahanId: true, kelurahan: { select: { kecamatanId: true } } } } },
      });
      if (kelurahanId == null) kelurahanId = rtRow?.rw.kelurahanId ?? null;
      if (kecamatanId == null) kecamatanId = rtRow?.rw.kelurahan?.kecamatanId ?? null;
    }

    const count = await prisma.laporanWarga.count();
    const kode = `JAK-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const laporan = await prisma.laporanWarga.create({
      data: {
        kodeLaporan: kode,
        channelType: body.channelType ?? 'web',
        namaPelapor: body.namaPelapor ?? user.nama,
        noHpPelapor: body.noHpPelapor,
        isiLaporan: body.isiLaporan,
        kategori: body.kategori,
        subkategori: body.subkategori,
        urgencyLevel: body.urgencyLevel ?? 'medium',
        lokasiText: body.lokasiText,
        rtId,
        kelurahanId,
        kecamatanId,
        isEmergency: body.urgencyLevel === 'critical',
        lampiranUrls: body.lampiranUrls ?? [],
        createdBy: user.sub,
      },
    });

    await prisma.laporanMessage.create({
      data: { laporanId: laporan.id, senderType: 'warga', messageText: body.isiLaporan },
    });
    return reply.code(201).send(laporan);
  });

  app.get('/:id', { preHandler: authScope(app) }, async (req, reply) => {
    const { id } = req.params as any;
    const user = req.user as any;
    const row = await findLaporanInScope(user, +id);
    if (!row) return reply.code(404).send({ error: 'Laporan tidak ditemukan' });
    return prisma.laporanWarga.findUnique({
      where: { id: +id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  });

  app.patch('/:id/status', { preHandler: authScope(app) }, async (req, reply) => {
    const user = req.user as any;
    if (!canManageLaporan(user.role)) {
      return reply.code(403).send({ error: 'Tidak berhak mengubah status laporan.' });
    }
    const { id } = req.params as any;
    const lap = await findLaporanInScope(user, +id);
    if (!lap) return reply.code(404).send({ error: 'Laporan tidak ditemukan' });

    const { status, catatan } = req.body as any;
    const laporan = await prisma.laporanWarga.update({
      where: { id: +id },
      data: { status, resolvedAt: status === 'selesai' ? new Date() : undefined },
    });
    if (catatan) {
      await prisma.laporanMessage.create({
        data: { laporanId: +id, senderType: 'admin', messageText: catatan, isInternal: true },
      });
    }
    return laporan;
  });

  app.post('/:id/pesan', { preHandler: authScope(app) }, async (req, reply) => {
    const user = req.user as any;
    if (!canManageLaporan(user.role)) {
      return reply.code(403).send({ error: 'Tidak berhak menambah pesan internal/tindak lanjut.' });
    }
    const { id } = req.params as any;
    const lap = await findLaporanInScope(user, +id);
    if (!lap) return reply.code(404).send({ error: 'Laporan tidak ditemukan' });

    const { messageText, isInternal } = req.body as any;
    const msg = await prisma.laporanMessage.create({
      data: { laporanId: +id, senderType: 'admin', messageText, isInternal: isInternal ?? false },
    });
    return reply.code(201).send(msg);
  });

  // Upload foto bukti
  app.post('/upload', { preHandler: authScope(app) }, async (req, reply) => {
    try {
      const data = await req.file();
      if (!data) return reply.code(400).send({ error: 'No file uploaded' });

      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const ext = path.extname(data.filename);
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const filepath = path.join(uploadDir, filename);

      await new Promise<void>((resolve, reject) => {
        const ws = fs.createWriteStream(filepath);
        data.file.pipe(ws);
        ws.on('finish', resolve);
        ws.on('error', reject);
      });

      return { url: `/uploads/${filename}`, filename };
    } catch (e: any) {
      return reply.code(500).send({ error: e.message });
    }
  });
}
