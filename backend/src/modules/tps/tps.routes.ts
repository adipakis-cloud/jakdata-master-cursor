// ── tps.routes.ts ────────────────────────────────────────────────
import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';

export async function tpsRoutes(app: FastifyInstance) {
  // Events
  app.get('/events', { preHandler: [app.authenticate] }, async () =>
    prisma.electionEvent.findMany({ orderBy: { createdAt: 'desc' } })
  );

  app.post('/events', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user as any;
    if (user.role !== 'admin_pusat' && user.role !== 'auditor') return reply.code(403).send({ error: 'Akses ditolak' });
    const body = req.body as any;
    const event = await prisma.electionEvent.create({
      data: { namaEvent: body.namaEvent, jenisEvent: body.jenisEvent, tanggalPemilihan: new Date(body.tanggalPemilihan), status: 'persiapan', kontestan: body.kontestan ?? [] },
    });
    return reply.code(201).send(event);
  });

  // TPS list
  app.get('/list', { preHandler: [app.authenticate] }, async (req) => {
    const { eventId, kelurahanId } = req.query as any;
    return prisma.tps.findMany({
      where: { electionId: eventId ? +eventId : undefined, kelurahanId: kelurahanId ? +kelurahanId : undefined },
      include: { results: { select: { status: true, suaraSah: true, jumlahPengguna: true } } },
    });
  });

  app.post('/list', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = req.body as any;
    const tps = await prisma.tps.create({
      data: {
        kodeTps: body.kodeTps,
        electionId: Number(body.electionId),
        rtId: body.rtId ? Number(body.rtId) : undefined,
        kelurahanId: body.kelurahanId ? Number(body.kelurahanId) : undefined,
        kecamatanId: body.kecamatanId ? Number(body.kecamatanId) : undefined,
        alamat: body.alamat,
        jumlahDpt: body.jumlahDpt ? Number(body.jumlahDpt) : 0,
      },
    });
    return reply.code(201).send(tps);
  });

  // Input hasil suara
  app.post('/results', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user as any;
    const body = req.body as any;

    // Validasi: suara tidak boleh melebihi DPT
    const tps = await prisma.tps.findUnique({ where: { id: +body.tpsId } });
    if (!tps) return reply.code(404).send({ error: 'TPS tidak ditemukan' });

    const totalSuara = Number(body.suaraSah ?? 0) + Number(body.suaraTidakSah ?? 0);
    if (totalSuara > tps.jumlahDpt && tps.jumlahDpt > 0) {
      return reply.code(400).send({ error: `Total suara (${totalSuara}) melebihi DPT (${tps.jumlahDpt}). Harap periksa kembali.` });
    }

    const result = await prisma.tpsResult.upsert({
      where: { tpsId_electionId: { tpsId: +body.tpsId, electionId: +body.electionId } },
      update: {
        jumlahPengguna: Number(body.jumlahPengguna ?? 0),
        suaraSah: Number(body.suaraSah ?? 0),
        suaraTidakSah: Number(body.suaraTidakSah ?? 0),
        hasilSuara: body.hasilSuara ?? {},
        buktiFotoUrl: body.buktiFotoUrl,
        status: 'submitted',
        inputBy: user.sub,
      },
      create: {
        tpsId: Number(body.tpsId),
        electionId: Number(body.electionId),
        jumlahPengguna: Number(body.jumlahPengguna ?? 0),
        suaraSah: Number(body.suaraSah ?? 0),
        suaraTidakSah: Number(body.suaraTidakSah ?? 0),
        hasilSuara: body.hasilSuara ?? {},
        buktiFotoUrl: body.buktiFotoUrl,
        status: 'submitted',
        inputBy: user.sub,
      },
    });
    return reply.code(201).send(result);
  });

  // Quick count agregasi
  app.get('/quick-count/:eventId', { preHandler: [app.authenticate] }, async (req) => {
    const { eventId } = req.params as any;
    const event = await prisma.electionEvent.findUnique({ where: { id: +eventId } });
    if (!event) return null;

    const totalTps = await prisma.tps.count({ where: { electionId: +eventId } });
    const submitted = await prisma.tpsResult.findMany({
      where: { electionId: +eventId, status: { in: ['submitted','verified'] } },
    });

    const tpsMasuk = submitted.length;
    const totalSuaraSah = submitted.reduce((s, r) => s + r.suaraSah, 0);
    const totalPengguna = submitted.reduce((s, r) => s + r.jumlahPengguna, 0);

    // Agregasi per kandidat
    const hasilAgregatMap: Record<string, number> = {};
    for (const r of submitted) {
      const hasil = r.hasilSuara as Record<string, number>;
      for (const [k, v] of Object.entries(hasil)) {
        hasilAgregatMap[k] = (hasilAgregatMap[k] ?? 0) + v;
      }
    }

    // Deteksi anomali
    const anomali = submitted.filter(r => {
      const tpsData = { jumlahDpt: 0 }; // simplified
      return r.suaraSah + r.suaraTidakSah > r.jumlahPengguna;
    });

    return {
      event: { id: event.id, namaEvent: event.namaEvent, status: event.status },
      totalTps, tpsMasuk,
      persenMasuk: totalTps > 0 ? Math.round((tpsMasuk / totalTps) * 100 * 100) / 100 : 0,
      totalPengguna, totalSuaraSah,
      hasilAgregatKontestan: hasilAgregatMap,
      anomaliTerdeteksi: anomali.length,
      // NETRAL: hanya data, tanpa interpretasi politik
      catatan: 'Data ini bersifat netral. Hasil resmi hanya dari KPU/KPUD.',
    };
  });
}

// ── official.routes.ts ────────────────────────────────────────────
export async function officialRoutes(app: FastifyInstance) {
  app.get('/profile', async () => {
    return prisma.publicOfficial.findFirst({ where: { aktif: true }, include: { aspirasi: { orderBy: { createdAt: 'desc' }, take: 10 } } });
  });

  app.put('/profile', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user as any;
    if (user.role !== 'admin_pusat') return reply.code(403).send({ error: 'Hanya admin pusat' });
    const body = req.body as any;
    const official = await prisma.publicOfficial.updateMany({
      where: { aktif: true },
      data: { namaLengkap: body.namaLengkap, gelarBelakang: body.gelarBelakang, officialPhotoUrl: body.officialPhotoUrl, jabatan: body.jabatan, komisi: body.komisi, dapil: body.dapil, periode: body.periode, bioSingkat: body.bioSingkat, visi: body.visi, misi: body.misi, waAspirasi: body.waAspirasi, instagram: body.instagram },
    });
    return official;
  });

  // Aspirasi warga
  app.post('/aspirasi', async (req, reply) => {
    const body = req.body as any;
    const official = await prisma.publicOfficial.findFirst({ where: { aktif: true } });
    if (!official) return reply.code(404).send({ error: 'Profil tidak ditemukan' });

    const asp = await prisma.officialAspirasi.create({
      data: { officialId: official.id, namaPelapor: body.namaPelapor, noHp: body.noHp, wilayah: body.wilayah, judulAspirasi: body.judulAspirasi, isiAspirasi: body.isiAspirasi, kategori: body.kategori },
    });
    return reply.code(201).send({ ...asp, pesan: 'Aspirasi Anda telah diterima. Tim kami akan menindaklanjuti.' });
  });

  app.get('/aspirasi', { preHandler: [app.authenticate] }, async (req) => {
    const { page = 1, limit = 20, status } = req.query as any;
    const official = await prisma.publicOfficial.findFirst({ where: { aktif: true } });
    if (!official) return { data: [], total: 0 };
    const where: any = { officialId: official.id };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      prisma.officialAspirasi.findMany({ where, take: +limit, orderBy: { createdAt: 'desc' } }),
      prisma.officialAspirasi.count({ where }),
    ]);
    return { data, total, page: +page, limit: +limit };
  });
}

// ── users.routes.ts ───────────────────────────────────────────────
export async function usersRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user as any;
    if (!['admin_pusat','auditor'].includes(user.role)) return reply.code(403).send({ error: 'Akses ditolak' });
    const { page = 1, limit = 20, role } = req.query as any;
    const where: any = {};
    if (role) where.role = role;
    const [data, total] = await Promise.all([
      prisma.user.findMany({ where, take: +limit, orderBy: { createdAt: 'desc' }, select: { id:true, uuid:true, nama:true, email:true, role:true, aktif:true, noHp:true, lastLoginAt:true, kecamatanId:true, kelurahanId:true, rwId:true, rtId:true, createdAt:true } }),
      prisma.user.count({ where }),
    ]);
    return { data, total, page: +page, limit: +limit };
  });

  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user as any;
    if (user.role !== 'admin_pusat') return reply.code(403).send({ error: 'Hanya admin pusat' });
    const body = req.body as any;
    if (!body.email || !body.password || !body.nama || !body.role) return reply.code(400).send({ error: 'Data tidak lengkap' });

    const bcrypt = require('bcryptjs');
    const newUser = await prisma.user.create({
      data: { nama: body.nama, email: body.email, passwordHash: await bcrypt.hash(body.password, 10), role: body.role, kecamatanId: body.kecamatanId, kelurahanId: body.kelurahanId, rwId: body.rwId, rtId: body.rtId, warmindoId: body.warmindoId },
      select: { id:true, uuid:true, nama:true, email:true, role:true, aktif:true },
    });
    return reply.code(201).send(newUser);
  });

  app.patch('/:id/status', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user as any;
    if (user.role !== 'admin_pusat') return reply.code(403).send({ error: 'Hanya admin pusat' });
    const { id } = req.params as any;
    const { aktif } = req.body as any;
    return prisma.user.update({ where: { id: +id }, data: { aktif }, select: { id:true, aktif:true } });
  });
}


