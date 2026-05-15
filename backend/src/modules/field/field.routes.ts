import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../config/prisma';
import { assertRtAccess, assertWarmindoAccess, fieldEvidenceDefaults, scopedRtIds, warmindoWhereForUser } from '../security/scope';
import { writeAuditLog } from '../security/security';

export async function fieldRoutes(app: FastifyInstance) {
  app.get('/overview', { preHandler: [app.authenticate] }, async (req: any) => {
    const user = req.user;
    const rtIds = await scopedRtIds(user);
    const rtWhere = rtIds === null ? {} : { id: { in: rtIds } };
    const wargaWhere = rtIds === null ? {} : { rtId: { in: rtIds } };
    const laporanWhere = rtIds === null ? {} : { rtId: { in: rtIds } };
    const warmindoWhere = await warmindoWhereForUser(user);

    const [stats, recentReports, fairness, ai, lowStock, bantuanCandidates] = await Promise.all([
      Promise.all([
        prisma.warga.count({ where: wargaWhere }),
        prisma.keluarga.count({ where: wargaWhere }),
        prisma.rT.count({ where: rtWhere }),
        prisma.laporanWarga.count({ where: { ...laporanWhere, status: { notIn: ['selesai', 'ditolak'] } } }),
        prisma.laporanWarga.count({ where: { ...laporanWhere, urgencyLevel: 'critical', status: { not: 'selesai' } } }),
        prisma.warmindoOutlet.count({ where: { ...warmindoWhere, status: 'aktif' } }),
      ]),
      prisma.laporanWarga.findMany({
        where: laporanWhere,
        orderBy: [{ isEmergency: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        select: { id: true, kodeLaporan: true, kategori: true, urgencyLevel: true, status: true, lokasiText: true, aiSummary: true, createdAt: true },
      }),
      (prisma as any).bantuanAnomaly.findMany({ where: { status: 'open' }, orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }], take: 6 }),
      (prisma as any).aIRecommendation.findMany({ where: { status: { in: ['proposed', 'accepted'] } }, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], take: 6 }),
      prisma.warmindoInventory.findMany({ where: { warmindo: warmindoWhere }, include: { warmindo: true }, take: 100 }),
      prisma.keluarga.findMany({
        where: { ...wargaWhere, skorPrioritasBantuan: { gte: 75 } },
        orderBy: { skorPrioritasBantuan: 'desc' },
        take: 8,
        include: { rt: { include: { rw: { include: { kelurahan: true } } } } },
      }),
    ]);

    const [totalWarga, totalKK, totalRT, openReports, criticalReports, activeWarmindo] = stats;
    return {
      stats: { totalWarga, totalKK, totalRT, openReports, criticalReports, activeWarmindo },
      recentReports,
      fairnessAlerts: fairness,
      aiRecommendations: ai,
      lowStock: lowStock.filter(i => i.stokSaatIni <= i.stokMinimum).slice(0, 8),
      bantuanCandidates,
    };
  });

  app.post('/evidence', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const body = req.body as any;
    const evidence = await (prisma as any).fieldEvidence.create({
      data: {
        actionType: body.actionType,
        entityType: body.entityType,
        entityId: body.entityId ? Number(body.entityId) : null,
        photoUrl: body.photoUrl,
        latitude: body.latitude === undefined || body.latitude === null ? null : Number(body.latitude),
        longitude: body.longitude === undefined || body.longitude === null ? null : Number(body.longitude),
        note: body.note,
        capturedAt: body.capturedAt ? new Date(body.capturedAt) : new Date(),
        ...fieldEvidenceDefaults(req.user),
      },
    });
    await writeAuditLog({ userId: req.user.sub, action: 'field.evidence.create', entityType: body.entityType, entityId: body.entityId ? Number(body.entityId) : undefined, newValues: body });
    return reply.code(201).send(evidence);
  });

  app.post('/upload', { preHandler: [app.authenticate] }, async (req, reply) => {
    try {
      const data = await req.file();
      if (!data) return reply.code(400).send({ error: 'No file uploaded' });

      const uploadDir = path.join(process.cwd(), 'uploads', 'field');
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

      return { url: `/uploads/field/${filename}`, filename };
    } catch (e: any) {
      return reply.code(500).send({ error: e.message });
    }
  });

  app.patch('/keluarga/:id', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const id = Number(req.params.id);
    const body = req.body as any;
    const keluarga = await prisma.keluarga.findUnique({ where: { id } });
    if (!keluarga) return reply.code(404).send({ error: 'Keluarga tidak ditemukan' });
    try { await assertRtAccess(req.user, keluarga.rtId); } catch (e: any) { return reply.code(e.statusCode ?? 500).send({ error: e.message }); }
    const updated = await prisma.keluarga.update({
      where: { id },
      data: {
        statusRumah: body.statusRumah,
        statusEkonomi: body.statusEkonomi || null,
        totalPenghasilan: body.totalPenghasilan === undefined ? undefined : Number(body.totalPenghasilan),
        skorPrioritasBantuan: body.skorPrioritasBantuan === undefined ? undefined : Number(body.skorPrioritasBantuan),
        kategoriBantuan: body.kategoriBantuan,
        catatan: body.catatan,
      },
    });
    await writeAuditLog({ userId: req.user.sub, action: 'field.keluarga.update', entityType: 'keluarga', entityId: id, newValues: body });
    return updated;
  });

  app.post('/bantuan/verify', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const body = req.body as any;
    const keluarga = await prisma.keluarga.findUnique({ where: { id: Number(body.keluargaId) } });
    if (!keluarga) return reply.code(404).send({ error: 'Keluarga tidak ditemukan' });
    try { await assertRtAccess(req.user, keluarga.rtId); } catch (e: any) { return reply.code(e.statusCode ?? 500).send({ error: e.message }); }
    const alert = await prisma.operationalAlert.create({
      data: {
        kodeAlert: `FIELD-AID-${Date.now()}`,
        kategori: 'aid_verification',
        severity: body.eligible ? 'high' : 'medium',
        status: 'open',
        judul: body.eligible ? 'Kandidat bantuan diverifikasi lapangan' : 'Kandidat bantuan ditolak/verifikasi ulang',
        deskripsi: body.note ?? 'Verifikasi bantuan dari petugas lapangan',
        source: 'field',
        entityType: 'keluarga',
        entityId: keluarga.id,
        wilayahLevel: 'rt',
        wilayahId: keluarga.rtId,
        metadata: { eligible: !!body.eligible, score: keluarga.skorPrioritasBantuan, photoUrl: body.photoUrl, latitude: body.latitude, longitude: body.longitude },
        createdBy: req.user.sub,
      },
    });
    await (prisma as any).fieldEvidence.create({
      data: {
        actionType: 'bantuan_verification',
        entityType: 'keluarga',
        entityId: keluarga.id,
        photoUrl: body.photoUrl,
        latitude: body.latitude === undefined ? null : Number(body.latitude),
        longitude: body.longitude === undefined ? null : Number(body.longitude),
        note: body.note,
        capturedAt: new Date(),
        ...fieldEvidenceDefaults(req.user),
      },
    });
    await writeAuditLog({ userId: req.user.sub, action: 'field.bantuan.verify', entityType: 'keluarga', entityId: keluarga.id, newValues: body });
    return reply.code(201).send(alert);
  });

  app.post('/warmindo/:id/attendance', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const warmindoId = Number(req.params.id);
    try { await assertWarmindoAccess(req.user, warmindoId); } catch (e: any) { return reply.code(e.statusCode ?? 500).send({ error: e.message }); }
    const body = req.body as any;
    const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
    tanggal.setHours(0, 0, 0, 0);
    const employeeId = Number(body.employeeId);
    const attendance = await (prisma as any).warmindoAttendance.create({
      data: {
        kodeAttendance: `FIELD-ATT-${Date.now()}`,
        warmindoId,
        employeeId,
        tanggal,
        checkIn: body.checkIn ? new Date(body.checkIn) : new Date(),
        checkOut: body.checkOut ? new Date(body.checkOut) : null,
        status: body.status ?? 'present',
        lateMinutes: Number(body.lateMinutes ?? 0),
        notes: body.notes,
      },
    });
    await writeAuditLog({ userId: req.user.sub, action: 'field.warmindo.attendance', entityType: 'warmindo_outlet', entityId: warmindoId, newValues: body });
    return reply.code(201).send(attendance);
  });

  app.post('/warmindo/:id/closing', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const warmindoId = Number(req.params.id);
    try { await assertWarmindoAccess(req.user, warmindoId); } catch (e: any) { return reply.code(e.statusCode ?? 500).send({ error: e.message }); }
    const body = req.body as any;
    const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
    tanggal.setHours(0, 0, 0, 0);
    const closing = await (prisma as any).warmindoDailyClosing.upsert({
      where: { warmindoId_tanggal: { warmindoId, tanggal } },
      update: {
        cashActual: Number(body.cashActual),
        variance: Number(body.cashActual) - Number(body.cashExpected ?? 0),
        status: Math.abs(Number(body.cashActual) - Number(body.cashExpected ?? 0)) > 0 ? 'variance' : 'closed',
        notes: body.notes,
        closedBy: req.user.sub,
      },
      create: {
        kodeClosing: `FIELD-CLOSE-${warmindoId}-${Date.now()}`,
        warmindoId,
        tanggal,
        totalSales: Number(body.totalSales ?? 0),
        totalExpenses: Number(body.totalExpenses ?? 0),
        cashExpected: Number(body.cashExpected ?? 0),
        cashActual: Number(body.cashActual ?? 0),
        variance: Number(body.cashActual ?? 0) - Number(body.cashExpected ?? 0),
        status: Math.abs(Number(body.cashActual ?? 0) - Number(body.cashExpected ?? 0)) > 0 ? 'variance' : 'closed',
        closedBy: req.user.sub,
        notes: body.notes,
      },
    });
    await writeAuditLog({ userId: req.user.sub, action: 'field.warmindo.closing', entityType: 'warmindo_outlet', entityId: warmindoId, newValues: body });
    return reply.code(201).send(closing);
  });
}
