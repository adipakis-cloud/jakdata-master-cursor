import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';

export async function aiRoutes(app: FastifyInstance) {
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

  app.get('/recommendations', { preHandler: [app.authenticate] }, async () => {
    const [rtKurang, laporanCritical, alerts, inventory, aidFairnessReports, memoryRecommendations] = await Promise.all([
      prisma.rT.findMany({ include: { _count: { select: { warga: true } }, rw: { include: { kelurahan: true } } } })
        .then(rts => rts.filter(r => r._count.warga < 10).slice(0, 5)),
      prisma.laporanWarga.findMany({ where: { urgencyLevel: 'critical', status: { not: 'selesai' } }, take: 5 }),
      prisma.operationalAlert.findMany({ where: { status: 'open' }, orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }], take: 8 }),
      prisma.warmindoInventory.findMany({ include: { warmindo: true }, take: 100 }),
      prisma.aiReport.findMany({ where: { tipe: { in: ['daily_operational_stress','kelurahan_kapuk_poverty_risk'] } }, orderBy: { createdAt: 'desc' }, take: 3 }),
      (prisma as any).aIRecommendation.findMany({ where: { status: { in: ['proposed','accepted','failed'] } }, orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);
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
