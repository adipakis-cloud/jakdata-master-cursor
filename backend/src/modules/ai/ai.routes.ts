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

  app.get('/recommendations', { preHandler: [app.authenticate] }, async () => {
    const [rtKurang, laporanCritical] = await Promise.all([
      prisma.rT.findMany({ include: { _count: { select: { warga: true } }, rw: { include: { kelurahan: true } } } })
        .then(rts => rts.filter(r => r._count.warga < 10).slice(0, 5)),
      prisma.laporanWarga.findMany({ where: { urgencyLevel: 'critical', status: { not: 'selesai' } }, take: 5 }),
    ]);
    return {
      wilayah: rtKurang.map(r => ({ tipe: 'data_lemah', pesan: `RT ${r.nomor} RW ${r.rw.nomor} ${r.rw.kelurahan.nama} baru ${r._count.warga} warga (target: 10)`, prioritas: 'high' })),
      laporan: laporanCritical.map(l => ({ tipe: 'critical_report', pesan: `[${l.kodeLaporan}] ${l.kategori}: ${(l.aiSummary ?? l.isiLaporan).slice(0, 60)}`, prioritas: 'critical' })),
      warmindo: [],
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
