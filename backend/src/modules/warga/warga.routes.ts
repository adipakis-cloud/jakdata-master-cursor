import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import { getPagination } from '../../lib/pagination';
import { sanitizeObject } from '../../lib/sanitize';
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

  app.post('/', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user;
    const raw = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const b = sanitizeObject(raw, ['nama', 'noHp', 'jenisKelamin', 'alamat', 'pekerjaan', 'catatan', 'kategori']) as any;

    if (!b.nama || !b.rtId) {
      return reply.code(400).send({ error: 'Nama dan RT wajib diisi' });
    }

    const targetRt = Number(b.rtId);
    if (isMobileFieldRole(user.role)) {
      const ok = await assertRtInScope(user, targetRt, reply);
      if (!ok) return;
    }

    const warga = await prisma.warga.create({
      data: {
        rtId: targetRt,
        nama: b.nama,
        noHp: b.noHp,
        jenisKelamin: b.jenisKelamin,
        alamat: b.alamat,
        pekerjaan: b.pekerjaan,
        kategori: b.kategori || 'warga_biasa',
        statusEkonomi: b.statusEkonomi || null,
        catatan: b.catatan,
        createdBy: user.sub,
      },
    });

    return reply.code(201).send(warga);
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
