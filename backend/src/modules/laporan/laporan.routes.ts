import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import path from 'path';
import fs from 'fs';
import { assertRtAccess, scopedRtIds } from '../security/scope';

export async function laporanRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (req) => {
    const user = req.user as any;
    const { status, urgency, kategori, page = 1, limit = 20 } = req.query as any;
    const rtIds = await scopedRtIds(user);
    let where: any = rtIds === null ? {} : { rtId: { in: rtIds } };
    if (status) where.status = status;
    if (urgency) where.urgencyLevel = urgency;
    if (kategori) where.kategori = kategori;

    const [data, total] = await Promise.all([
      prisma.laporanWarga.findMany({ where, skip: (+page-1)*+limit, take: +limit, orderBy: [{ isEmergency: 'desc' },{ createdAt: 'desc' }] }),
      prisma.laporanWarga.count({ where }),
    ]);
    return { data, total, page: +page, limit: +limit };
  });

  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user as any;
    const body = req.body as any;
    if (!body.isiLaporan || !body.kategori) return reply.code(400).send({ error: 'Isi laporan dan kategori wajib' });

    const count = await prisma.laporanWarga.count();
    const kode = `JAK-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const selectedRtId = body.rtId ? +body.rtId : (user.rtId ?? null);
    if (selectedRtId) {
      try { await assertRtAccess(user, selectedRtId); } catch (e: any) { return reply.code(e.statusCode ?? 500).send({ error: e.message }); }
    }

    const laporan = await prisma.laporanWarga.create({
      data: {
        kodeLaporan: kode, channelType: body.channelType ?? 'web',
        namaPelapor: body.namaPelapor ?? user.nama, noHpPelapor: body.noHpPelapor,
        isiLaporan: body.isiLaporan, kategori: body.kategori, subkategori: body.subkategori,
        urgencyLevel: body.urgencyLevel ?? 'medium', lokasiText: body.lokasiText,
        rtId: selectedRtId,
        isEmergency: body.urgencyLevel === 'critical', lampiranUrls: body.lampiranUrls ?? [],
        createdBy: user.sub,
      },
    });

    await prisma.laporanMessage.create({ data: { laporanId: laporan.id, senderType: 'warga', messageText: body.isiLaporan } });
    return reply.code(201).send(laporan);
  });

  app.get('/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as any;
    return prisma.laporanWarga.findUnique({ where: { id: +id }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
  });

  app.patch('/:id/status', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as any;
    const { status, catatan } = req.body as any;
    const existing = await prisma.laporanWarga.findUnique({ where: { id: +id } });
    if (existing?.rtId) {
      try { await assertRtAccess(req.user as any, existing.rtId); } catch (e: any) { return (reply as any).code(e.statusCode ?? 500).send({ error: e.message }); }
    }
    const laporan = await prisma.laporanWarga.update({ where: { id: +id }, data: { status, resolvedAt: status === 'selesai' ? new Date() : undefined } });
    if (catatan) await prisma.laporanMessage.create({ data: { laporanId: +id, senderType: 'admin', messageText: catatan, isInternal: true } });
    return laporan;
  });

  app.post('/:id/pesan', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as any;
    const { messageText, isInternal } = req.body as any;
    const msg = await prisma.laporanMessage.create({ data: { laporanId: +id, senderType: 'admin', messageText, isInternal: isInternal ?? false } });
    return reply.code(201).send(msg);
  });

  // Upload foto bukti
  app.post('/upload', { preHandler: [app.authenticate] }, async (req, reply) => {
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
