import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { prisma } from '../../config/prisma';
import { getPagination } from '../../lib/pagination';
import { sanitizeObject } from '../../lib/sanitize';
import { checkWargaDuplicate } from '../../lib/wargaDuplicate';
import { territoryScopeMiddleware } from '../../middleware/territoryScope.middleware';
import { assertRtInScope, buildWargaListWhere, findWargaInScope, isMobileFieldRole } from '../security/security';

function authScope(app: FastifyInstance) {
  return [app.authenticate, territoryScopeMiddleware];
}

export async function wargaRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user;
    const { rtId, q, search } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const scope = (req as any).territoryPrisma?.warga ?? (await buildWargaListWhere(user));
    const where: any = { AND: [scope, { deletedAt: null }] };

    if (rtId) {
      const rid = Number(rtId);
      const ok = await assertRtInScope(user, rid, reply);
      if (!ok) return;
      where.AND.push({ rtId: rid });
    }

    const term = (search ?? q) as string | undefined;
    if (term && String(term).trim()) {
      const s = String(term).trim();
      where.AND.push({
        OR: [
          { nama: { contains: s, mode: 'insensitive' } },
          { nikEncrypted: { contains: s, mode: 'insensitive' } },
        ],
      });
    }

    const [data, total] = await Promise.all([
      prisma.warga.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { rt: { include: { rw: { include: { kelurahan: true } } } } },
      }),
      prisma.warga.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { data, total, page, limit, totalPages };
  });

  app.get('/check-nik/:nik', { preHandler: authScope(app) }, async (req: any) => {
    const nik = String(req.params.nik ?? '').trim();
    const result = await checkWargaDuplicate({ nik });
    return {
      valid: !result.isDuplicate,
      issues: result.issues,
      nikInfo: result.nikInfo,
    };
  });

  app.post('/check-duplicate', { preHandler: authScope(app) }, async (req: any) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const nik = body.nik != null ? String(body.nik) : undefined;
    const noHp = body.noHp != null ? String(body.noHp) : undefined;
    const nama = body.nama != null ? String(body.nama) : undefined;
    const tanggalLahirStr = body.tanggalLahirStr != null ? String(body.tanggalLahirStr) : undefined;
    const tanggalLahir = tanggalLahirStr ? new Date(tanggalLahirStr) : undefined;
    const excludeId = body.excludeId != null ? Number(body.excludeId) : undefined;
    return checkWargaDuplicate({
      nik,
      noHp,
      nama,
      tanggalLahir: tanggalLahir && !Number.isNaN(tanggalLahir.getTime()) ? tanggalLahir : undefined,
      excludeId: excludeId > 0 ? excludeId : undefined,
    });
  });

  app.post('/', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user;
    const raw = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const b = sanitizeObject(raw, [
      'nama',
      'noHp',
      'nik',
      'jenisKelamin',
      'alamat',
      'pekerjaan',
      'catatan',
      'kategori',
      'statusEkonomi',
    ]) as any;

    if (!b.nama || !b.rtId) {
      return reply.code(400).send({ error: 'Nama dan RT wajib diisi' });
    }

    const targetRt = Number(b.rtId);
    if (isMobileFieldRole(user.role)) {
      const ok = await assertRtInScope(user, targetRt, reply);
      if (!ok) return;
    }

    const nikClean = b.nik ? String(b.nik).replace(/\s/g, '') : undefined;
    const tanggalLahir =
      b.tanggalLahir != null && String(b.tanggalLahir).trim()
        ? new Date(String(b.tanggalLahir))
        : undefined;

    const dup = await checkWargaDuplicate({
      nik: nikClean,
      noHp: b.noHp,
      nama: b.nama,
      tanggalLahir: tanggalLahir && !Number.isNaN(tanggalLahir.getTime()) ? tanggalLahir : undefined,
    });

    if (dup.isDuplicate) {
      return reply.code(409).send({
        error: 'Data warga tidak dapat disimpan',
        reason: dup.issues.find((i) => i.severity === 'error')?.message ?? 'Data duplikat',
        issues: dup.issues,
      });
    }

    const warga = await prisma.warga.create({
      data: {
        rtId: targetRt,
        nama: b.nama,
        nikHash: nikClean || null,
        noHp: b.noHp || null,
        jenisKelamin: b.jenisKelamin || null,
        tanggalLahir: tanggalLahir && !Number.isNaN(tanggalLahir.getTime()) ? tanggalLahir : null,
        alamat: b.alamat || null,
        pekerjaan: b.pekerjaan || null,
        penghasilanEst: b.penghasilanEst != null ? Number(b.penghasilanEst) : null,
        kategori: b.kategori || 'warga_biasa',
        statusEkonomi: b.statusEkonomi || null,
        catatan: b.catatan || null,
        createdBy: user.sub,
      },
    });

    const warnings = dup.issues.filter((i) => i.severity === 'warning');
    if (warnings.length > 0) {
      return reply.code(201).send({ warga, warnings: dup.issues });
    }

    return reply.code(201).send(warga);
  });

  app.post('/:id/foto-ktp', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: 'ID tidak valid' });

    const row = await findWargaInScope(req.user, id);
    if (!row) return reply.code(404).send({ error: 'Warga tidak ditemukan' });

    const data = await req.file();
    if (!data) return reply.code(400).send({ error: 'File foto KTP wajib' });

    const mime = data.mimetype ?? '';
    if (!mime.startsWith('image/')) {
      return reply.code(400).send({ error: 'Hanya file gambar yang diizinkan' });
    }

    const ext = path.extname(data.filename || '') || '.jpg';
    const fname = `ktp-${id}-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'ktp');
    fs.mkdirSync(uploadDir, { recursive: true });
    const dest = path.join(uploadDir, fname);
    await pipeline(data.file, fs.createWriteStream(dest));

    const fotoUrl = `/uploads/ktp/${fname}`;
    await prisma.warga.update({ where: { id }, data: { fotoUrl } });

    console.log(`[JAKDATA] Foto KTP warga #${id} disimpan: ${fotoUrl}`);
    return { success: true, fotoUrl };
  });

  app.get('/:id', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const id = Number(req.params.id);
    const row = await findWargaInScope(req.user, id);
    if (!row) return reply.code(404).send({ error: 'Warga tidak ditemukan' });
    return prisma.warga.findUnique({
      where: { id },
      include: {
        rt: {
          include: {
            rw: {
              include: {
                kelurahan: { include: { kecamatan: true } },
              },
            },
          },
        },
        keluarga: true,
      },
    });
  });

  app.put('/:id', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const id = Number(req.params.id);
    const row = await findWargaInScope(req.user, id);
    if (!row) return reply.code(404).send({ error: 'Warga tidak ditemukan' });

    const raw = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const b = sanitizeObject(raw, ['nama', 'noHp', 'kategori', 'catatan']) as any;
    return prisma.warga.update({
      where: { id },
      data: {
        nama: b.nama,
        noHp: b.noHp,
        kategori: b.kategori,
        statusEkonomi: b.statusEkonomi || null,
        catatan: b.catatan,
      },
    });
  });

  app.get('/keluarga/list', { preHandler: authScope(app) }, async (req: any) => {
    const user = req.user;
    const { page, limit, skip } = getPagination(req.query);
    const scope = (req as any).territoryPrisma?.warga ?? (await buildWargaListWhere(user));
    const where: any = { AND: [scope] };
    const [data, total] = await Promise.all([
      prisma.keluarga.findMany({
        where,
        include: { rt: true, _count: { select: { warga: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.keluarga.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { data, total, page, limit, totalPages };
  });

  app.post('/keluarga', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user;
    const b = req.body;
    const targetRt = Number(b.rtId);
    if (isMobileFieldRole(user.role)) {
      const ok = await assertRtInScope(user, targetRt, reply);
      if (!ok) return;
    }

    const kk = await prisma.keluarga.create({
      data: {
        rtId: targetRt,
        namaKepala: b.namaKepala,
        noHpKepala: b.noHpKepala,
        jumlahAnggota: Number(b.jumlahAnggota) || 1,
        jumlahTanggungan: Number(b.jumlahTanggungan) || 0,
        statusEkonomi: b.statusEkonomi || null,
        totalPenghasilan: Number(b.totalPenghasilan) || 0,
      },
    });
    return reply.code(201).send(kk);
  });
}
