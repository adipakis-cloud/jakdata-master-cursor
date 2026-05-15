import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { computeWilayahMeta, loginRedirectTo } from '../../lib/loginWilayah';
import { checkLoginRateLimit, recordFailedLogin, clearLoginAttempts, writeAuditLog } from '../security/security';

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
          errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
          }),
        },
      },
    },
    async (req, reply) => {
      const { email, password } = req.body as any;
      const ip = req.ip ?? 'unknown';
      if (!email || !password) return reply.code(400).send({ error: 'Email dan password wajib' });

      const { allowed, retryAfter } = await checkLoginRateLimit(ip, email);
      if (!allowed) return reply.code(429).send({ error: `Terlalu banyak percobaan. Coba lagi dalam ${retryAfter} detik.` });

      const user = await prisma.user.findUnique({ where: { email } });

      if (user?.lockedUntil && user.lockedUntil > new Date()) {
        const sisa = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        return reply.code(403).send({ error: `Akun terkunci ${sisa} menit.` });
      }

      const valid = user && (await bcrypt.compare(password, user.passwordHash));
      if (!valid) {
        recordFailedLogin(ip, email);
        if (user) {
          const attempts = (user.loginAttempts ?? 0) + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginAttempts: attempts,
              lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : undefined,
            },
          });
        }
        await writeAuditLog({ action: 'login.failed', ipAddress: ip, newValues: { email } });
        return reply.code(401).send({ error: 'Email atau password salah' });
      }

      if (!user.aktif) return reply.code(403).send({ error: 'Akun tidak aktif.' });

      clearLoginAttempts(ip, email);
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), loginAttempts: 0, lockedUntil: null },
      });

      const { wilayahId, wilayahType } = computeWilayahMeta(user);
      const redirectTo = loginRedirectTo(user.role);
      const token = app.jwt.sign(
        {
          sub: user.id,
          userId: user.id,
          email: user.email,
          role: user.role,
          nama: user.nama,
          wilayahId,
          wilayahType,
          kotaId: user.kotaId,
          kecamatanId: user.kecamatanId,
          kelurahanId: user.kelurahanId,
          rwId: user.rwId,
          rtId: user.rtId,
          warmindoId: user.warmindoId,
        },
        { expiresIn: '7d' },
      );

      await writeAuditLog({ userId: user.id, action: 'login.success', ipAddress: ip });

      return {
        token,
        redirectTo,
        user: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          role: user.role,
          noHp: user.noHp,
          wilayahId,
          wilayahType,
          kotaId: user.kotaId,
          kecamatanId: user.kecamatanId,
          kelurahanId: user.kelurahanId,
          rwId: user.rwId,
          rtId: user.rtId,
          warmindoId: user.warmindoId,
        },
      };
    }
  );

  app.post('/logout', { preHandler: [app.authenticate] }, async () => ({ ok: true }));

  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const payload = req.user as any;
    const row = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        uuid: true,
        nama: true,
        email: true,
        role: true,
        noHp: true,
        aktif: true,
        lastLoginAt: true,
        kotaId: true,
        kecamatanId: true,
        kelurahanId: true,
        rwId: true,
        rtId: true,
        warmindoId: true,
        kota: { select: { id: true, nama: true } },
        kecamatan: { select: { id: true, nama: true } },
        kelurahan: { select: { id: true, nama: true } },
        rw: { select: { id: true, nomor: true } },
        rt: { select: { id: true, nomor: true } },
      },
    });
    if (!row) return null;
    const { wilayahId, wilayahType } = computeWilayahMeta(row);
    return { ...row, wilayahId, wilayahType };
  });
}
