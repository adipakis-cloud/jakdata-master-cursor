import { FastifyInstance } from 'fastify';
import QRCode from 'qrcode';
import { prisma } from '../../config/prisma';
import { aiQueue } from '../../queues/queue.config';
import { analyzeWarmindoEconomics } from '../../ai/modules/economic-ai/economic.service';
import { getWhatsappStatus } from '../../ai/modules/whatsapp-ai/whatsapp.service';
import { buildLaporanListWhere, buildWilayahKeyedListWhere, resolveVisibleRtIds } from '../security/security';

export async function aiRoutes(app: FastifyInstance) {
  app.get('/alerts', { preHandler: [app.authenticate] }, async (req) => {
    const limit = Number((req.query as any).limit ?? 20);
    const resolved = (req.query as any).resolved === 'true';
    const alerts = await prisma.aiAlert.findMany({
      where: { isResolved: resolved },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { success: true, data: alerts };
  });

  app.get('/economic-alerts', { preHandler: [app.authenticate] }, async (req) => {
    const limit = Number((req.query as any).limit ?? 20);
    const alerts = await prisma.economicAlert.findMany({
      where: { isRead: false },
      orderBy: { detectedAt: 'desc' },
      take: limit,
    });
    return { success: true, data: alerts, total: alerts.length };
  });

  app.get('/economic-scores', { preHandler: [app.authenticate] }, async () => {
    const scores = await prisma.economicScore.findMany({
      orderBy: { score: 'asc' },
      distinct: ['wilayahId'],
      take: 50,
    });
    return { success: true, data: scores };
  });

  app.get('/engine-recommendations', { preHandler: [app.authenticate] }, async () => {
    const recs = await prisma.aiRecommendation.findMany({
      where: { isActed: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return { success: true, data: recs };
  });

  app.get('/health-scores', { preHandler: [app.authenticate] }, async (req) => {
    const wilayahType = (req.query as { wilayahType?: string }).wilayahType;
    const where = wilayahType ? { wilayahType: String(wilayahType) } : {};
    const scores = await prisma.territorialHealthScore.findMany({
      where,
      orderBy: { overallScore: 'asc' },
      take: 50,
    });
    return { success: true, data: scores };
  });

  app.get('/status', { preHandler: [app.authenticate] }, async () => {
    const waStatus = getWhatsappStatus();

    const [alertCount, recCount, whatsappMsgCount, emailCount] = await Promise.all([
      prisma.aiAlert.count({ where: { isResolved: false } }),
      prisma.aiRecommendation.count({ where: { isActed: false } }),
      prisma.whatsappMessage.count(),
      prisma.emailMessage.count(),
    ]);

    const waSession = await prisma.whatsappSession.findUnique({
      where: { sessionKey: 'main' },
    });

    return {
      success: true,
      data: {
        whatsapp: {
          connected: waStatus.connected,
          status: waSession?.status ?? 'unknown',
          phone: process.env.WA_PHONE_NUMBER ?? '08131876268',
        },
        email: {
          address: process.env.EMAIL_USER ?? 'jakdatabmpan@gmail.com',
          active: !!process.env.EMAIL_PASSWORD,
        },
        stats: {
          activeAlerts: alertCount,
          activeRecommendations: recCount,
          totalWhatsappMessages: whatsappMsgCount,
          totalEmails: emailCount,
        },
      },
    };
  });

  app.get('/whatsapp-qr', async (req, reply) => {
    try {
      const session = await prisma.whatsappSession.findUnique({
        where: { sessionKey: 'main' },
      });

      if (!session) {
        return reply.code(404).send({
          success: false,
          message: 'Session belum ada. Start backend dulu.',
        });
      }

      if (session.status === 'active') {
        return reply.send({
          success: true,
          status: 'connected',
          message: 'WhatsApp sudah terhubung. Tidak perlu scan QR.',
        });
      }

      if (!session.qrCode) {
        return reply.code(404).send({
          success: false,
          status: session.status,
          message: 'QR belum generate. Tunggu beberapa detik dan refresh.',
        });
      }

      const qrDataUrl = await QRCode.toDataURL(session.qrCode, {
        width: 300,
        margin: 2,
      });

      const phone = process.env.WA_PHONE_NUMBER ?? '08131876268';
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>JAKDATA — WhatsApp QR</title>
  <meta http-equiv="refresh" content="30">
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #030712;
      color: white;
    }
    h2 { color: #22c55e; }
    img {
      border: 4px solid #22c55e;
      border-radius: 12px;
      padding: 16px;
      background: white;
    }
    p { color: #9ca3af; font-size: 14px; }
    .warning { color: #f59e0b; }
  </style>
</head>
<body>
  <h2>🧠 JAKDATA WhatsApp AI</h2>
  <img src="${qrDataUrl}" alt="QR Code WhatsApp" />
  <p>Scan dengan WhatsApp nomor <strong>${phone}</strong></p>
  <p>WA → ⋮ → Linked Devices → Link a Device → Scan</p>
  <p class="warning">⚠️ Halaman auto-refresh setiap 30 detik</p>
  <p>Status: <strong>${session.status}</strong></p>
</body>
</html>`;

      return reply.type('text/html').send(html);
    } catch (err) {
      console.error('[WhatsApp QR] Error:', err);
      return reply.code(500).send({ success: false, message: 'Gagal generate QR' });
    }
  });

  app.get('/whatsapp-messages', { preHandler: [app.authenticate] }, async () => {
    const messages = await prisma.whatsappMessage.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 50,
    });
    return { success: true, data: messages };
  });

  app.get('/email-messages', { preHandler: [app.authenticate] }, async () => {
    const emails = await prisma.emailMessage.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 50,
    });
    return { success: true, data: emails };
  });

  app.patch('/alerts/:id/resolve', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const alert = await prisma.aiAlert.update({
        where: { id },
        data: { isResolved: true, resolvedAt: new Date() },
      });
      return { success: true, data: alert };
    } catch {
      return reply.code(404).send({ success: false, message: 'Alert tidak ditemukan' });
    }
  });

  app.post('/trigger/economic-analysis', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { warmindoId } = (req.body ?? {}) as { warmindoId?: number };
    if (!warmindoId) {
      return reply.code(400).send({ success: false, message: 'warmindoId wajib diisi' });
    }
    const job = await aiQueue.add(
      'economic-analysis-warmindo',
      { warmindoId: Number(warmindoId) },
      { priority: 3 }
    );
    return {
      success: true,
      message: 'Economic analysis dijadwalkan',
      jobId: job.id,
    };
  });

  app.post('/trigger/economic-analysis/sync', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { warmindoId } = (req.body ?? {}) as { warmindoId?: number };
    if (!warmindoId) {
      return reply.code(400).send({ success: false, message: 'warmindoId wajib diisi' });
    }
    await analyzeWarmindoEconomics(Number(warmindoId));
    return { success: true, message: 'Economic analysis selesai' };
  });

  app.post('/task', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user as any;
    const { tipe, inputData } = req.body as any;
    const task = await prisma.aiTask.create({ data: { tipe, inputData, status: 'pending', createdBy: user.sub } });
    if (process.env.ANTHROPIC_API_KEY) processAiTask(task.id).catch(console.error);
    return reply.code(202).send({ taskId: task.id, status: 'pending' });
  });

  app.get('/task/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as any;
    return prisma.aiTask.findUnique({ where: { id: +id } });
  });

  app.post('/design', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user as any;
    const { tipe, platform, inputData } = req.body as any;
    const job = await prisma.designJob.create({ data: { tipe, platform, inputData, status: 'pending', createdBy: user.sub } });
    if (process.env.ANTHROPIC_API_KEY) processDesignJob(job.id, inputData).catch(console.error);
    return reply.code(202).send({ jobId: job.id });
  });

  app.get('/design/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as any;
    return prisma.designJob.findUnique({ where: { id: +id } });
  });

  app.get('/reports', { preHandler: [app.authenticate] }, async () =>
    prisma.aiReport.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
  );

  app.get('/memory', { preHandler: [app.authenticate] }, async () => {
    const [observations, recommendations, decisions, outcomes, learning, failures, causal] = await Promise.all([
      (prisma as any).aIObservation.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      (prisma as any).aIRecommendation.findMany({ orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], take: 20 }),
      (prisma as any).humanDecision.findMany({ orderBy: { decidedAt: 'desc' }, take: 20 }),
      (prisma as any).outcomeTracking.findMany({ orderBy: { measuredAt: 'desc' }, take: 20 }),
      (prisma as any).aILearningMemory.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      (prisma as any).aIFailureMemory.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      (prisma as any).aICausalInference.findMany({ orderBy: { confidence: 'desc' }, take: 10 }),
    ]);
    return { observations, recommendations, decisions, outcomes, learning, failures, causal };
  });

  app.get('/recommendations', { preHandler: [app.authenticate] }, async (req: any) => {
    const user = req.user as any;
    const laporanWhere = await buildLaporanListWhere(user);
    const alertWhere = await buildWilayahKeyedListWhere(user);
    const rtIds = await resolveVisibleRtIds(user);
    const rtWhere = rtIds === null ? {} : rtIds.length === 0 ? { id: -1 } : { id: { in: rtIds } };

    let inventoryWhere: any = {};
    if (rtIds !== null) {
      if (rtIds.length === 0) inventoryWhere = { id: -1 };
      else {
        const kelRows = await prisma.rT.findMany({
          where: { id: { in: rtIds } },
          select: { rw: { select: { kelurahanId: true } } },
        });
        const kelIds = [...new Set(kelRows.map((r) => r.rw.kelurahanId))];
        const outlets = await prisma.warmindoOutlet.findMany({
          where: { OR: [{ rtId: { in: rtIds } }, { kelurahanId: { in: kelIds } }] },
          select: { id: true },
        });
        const ids = outlets.map((o) => o.id);
        inventoryWhere = ids.length ? { warmindoId: { in: ids } } : { id: -1 };
      }
    }

    const rts = await prisma.rT.findMany({
      where: rtWhere,
      include: { _count: { select: { warga: true } }, rw: { include: { kelurahan: true } } },
      take: 80,
    });
    const rtKurang = rts.filter((r) => r._count.warga < 10).slice(0, 5);
    const laporanCritical = await prisma.laporanWarga.findMany({
      where: { AND: [laporanWhere, { urgencyLevel: 'critical', status: { not: 'selesai' } }] },
      take: 5,
    });
    const alertBase = { status: 'open' as const };
    const alertsWhere =
      Object.keys(alertWhere).length === 0 ? alertBase : { AND: [alertBase, alertWhere] };
    const alerts = await prisma.operationalAlert.findMany({
      where: alertsWhere,
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: 8,
    });
    const inventory = await prisma.warmindoInventory.findMany({
      where: inventoryWhere,
      include: { warmindo: true },
      take: 100,
    });
    const aidFairnessReports = await prisma.aiReport.findMany({
      where: { tipe: { in: ['daily_operational_stress', 'kelurahan_kapuk_poverty_risk'] } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    const memoryRecommendations = await (prisma as any).aIRecommendation.findMany({
      where: { status: { in: ['proposed', 'accepted', 'failed'] } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    const lowStock = inventory.filter(i => i.stokSaatIni <= i.stokMinimum).slice(0, 5);
    return {
      wilayah: rtKurang.map(r => ({ tipe: 'data_lemah', pesan: `RT ${r.nomor} RW ${r.rw.nomor} ${r.rw.kelurahan.nama} baru ${r._count.warga} warga (target: 10)`, prioritas: 'high' })),
      laporan: laporanCritical.map(l => ({ tipe: 'critical_report', pesan: `[${l.kodeLaporan}] ${l.kategori}: ${(l.aiSummary ?? l.isiLaporan).slice(0, 60)}`, prioritas: 'critical' })),
      warmindo: [
        ...lowStock.map(i => ({ tipe: 'low_stock', pesan: `${i.warmindo.namaOutlet}: ${i.namaBahan} tersisa ${i.stokSaatIni} ${i.satuan} (minimum ${i.stokMinimum})`, prioritas: 'high' })),
        ...alerts.filter(a => a.kategori === 'warmindo').map(a => ({ tipe: 'warmindo_alert', pesan: `${a.judul}: ${a.deskripsi}`, prioritas: a.severity })),
      ],
      bantuan: [
        ...alerts.filter(a => a.kategori === 'aid_fairness').map(a => ({ tipe: 'aid_fairness', pesan: `${a.judul}: ${a.deskripsi}`, prioritas: a.severity })),
        ...aidFairnessReports.flatMap(r => (r.rekomendasi as any[]).map((x: any) => ({ tipe: r.tipe, pesan: x.aksi ?? r.ringkasan, prioritas: x.prioritas ?? 'high' }))).slice(0, 5),
      ],
      governance: alerts.filter(a => a.kategori === 'governance').map(a => ({ tipe: 'governance_alert', pesan: `${a.judul}: ${a.deskripsi}`, prioritas: a.severity })),
      memory: memoryRecommendations.map((r: any) => ({ tipe: 'ai_memory', pesan: `${r.domain}: ${r.recommendation}`, prioritas: r.priority, status: r.status })),
    };
  });
}

async function processAiTask(taskId: number) {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const task = await prisma.aiTask.findUnique({ where: { id: taskId } });
    if (!task) return;
    await prisma.aiTask.update({ where: { id: taskId }, data: { status: 'processing', startedAt: new Date() } });
    const input = task.inputData as any;
    let prompt = task.tipe === 'classify_report'
      ? `Analisis laporan warga JAKDATA. Balas HANYA JSON:\n{"kategori":"bencana|sosial|pendidikan|kesehatan|ekonomi|bantuan","subkategori":"string","urgency_level":"critical|high|medium|low","summary":"1 kalimat","recommendation":"1-2 kalimat"}\n\nLaporan: "${input.isiLaporan}"`
      : `Analisis: ${JSON.stringify(input)}. JSON: {"findings":["string"],"recommendations":["string"]}`;
    const response = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 500, messages: [{ role: 'user', content: prompt }] });
    const text = response.content[0].text;
    let outputData: any;
    try { outputData = JSON.parse(text.replace(/```json\n?|\n?```/g, '')); } catch { outputData = { result: text }; }
    await prisma.aiTask.update({ where: { id: taskId }, data: { status: 'done', outputData, modelUsed: 'claude-sonnet-4-20250514', doneAt: new Date() } });
  } catch (err: any) {
    await prisma.aiTask.update({ where: { id: taskId }, data: { status: 'failed', errorMessage: err.message } });
  }
}

async function processDesignJob(jobId: number, inputData: any) {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    await prisma.designJob.update({ where: { id: jobId }, data: { status: 'processing' } });
    const response = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 400, system: 'Copywriter JAKDATA Jakarta. Formal tapi hangat. Output teks saja.', messages: [{ role: 'user', content: inputData.prompt }] });
    await prisma.designJob.update({ where: { id: jobId }, data: { status: 'done', generatedText: response.content[0].text } });
  } catch {
    await prisma.designJob.update({ where: { id: jobId }, data: { status: 'failed' } });
  }
}
