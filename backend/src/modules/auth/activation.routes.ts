import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

function requireAdminPusat(role: string) {
  return role === 'admin_pusat';
}

export async function activationRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const jwt = req.user as { role: string };
    if (!requireAdminPusat(jwt.role)) {
      return reply.code(403).send({ success: false, message: 'Hanya admin pusat' });
    }

    const rows = await prisma.$queryRaw<
      {
        id: number;
        kode: string;
        level: string;
        kecamatan_id: number | null;
        max_usage: number;
        used_count: number;
        aktif: boolean;
        expired_at: Date | null;
        created_at: Date;
      }[]
    >(Prisma.sql`SELECT id, kode, level, kecamatan_id, max_usage, used_count, aktif, expired_at, created_at
                  FROM activation_codes ORDER BY created_at DESC`);

    return { success: true, data: rows };
  });

  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const jwt = req.user as { role: string; sub: number };
    if (!requireAdminPusat(jwt.role)) {
      return reply.code(403).send({ success: false, message: 'Hanya admin pusat' });
    }

    const body = (req.body ?? {}) as {
      kode?: string;
      level?: string;
      kecamatanId?: number;
      maxUsage?: number;
      expiredAt?: string;
    };

    if (!body.kode?.trim() || !body.level?.trim()) {
      return reply.code(400).send({ success: false, message: 'kode dan level wajib' });
    }

    const levels = ['kecamatan', 'kelurahan', 'rw', 'rt'];
    if (!levels.includes(body.level)) {
      return reply.code(400).send({ success: false, message: 'level tidak valid' });
    }

    try {
      await prisma.$executeRaw(
        Prisma.sql`INSERT INTO activation_codes (kode, level, kecamatan_id, max_usage, aktif, expired_at, created_by)
                   VALUES (${body.kode.trim()}, ${body.level}, ${body.kecamatanId ?? null},
                           ${body.maxUsage ?? 999}, true, ${body.expiredAt ? new Date(body.expiredAt) : null},
                           ${jwt.sub})`,
      );
    } catch {
      return reply.code(409).send({ success: false, message: 'Kode sudah ada' });
    }

    return { success: true, message: 'Kode aktivasi dibuat' };
  });

  app.patch('/:kode/toggle', { preHandler: [app.authenticate] }, async (req, reply) => {
    const jwt = req.user as { role: string };
    if (!requireAdminPusat(jwt.role)) {
      return reply.code(403).send({ success: false, message: 'Hanya admin pusat' });
    }

    const { kode } = req.params as { kode: string };
    const rows = await prisma.$queryRaw<{ aktif: boolean }[]>(
      Prisma.sql`SELECT aktif FROM activation_codes WHERE kode = ${decodeURIComponent(kode)} LIMIT 1`,
    );
    if (!rows[0]) return reply.code(404).send({ success: false, message: 'Kode tidak ditemukan' });

    const next = !rows[0].aktif;
    await prisma.$executeRaw(
      Prisma.sql`UPDATE activation_codes SET aktif = ${next} WHERE kode = ${decodeURIComponent(kode)}`,
    );

    return { success: true, kode, aktif: next };
  });
}
