import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { prisma } from '../../config/prisma';
import { computeWilayahMeta, loginRedirectTo } from '../../lib/loginWilayah';
import {
  hashPassword,
  isDefaultPasswordUser,
  validateNewPassword,
} from '../../lib/passwordPolicy';
import { checkLoginRateLimit, recordFailedLogin, clearLoginAttempts, writeAuditLog } from '../security/security';
import {
  findActivationCode,
  incrementActivationCodeUsage,
  levelLabel,
  normalizeNoHp,
  roleFromActivationLevel,
  validateActivationCodeRow,
} from '../../lib/activationCode';

function jwtUserId(req: { user?: { sub?: number; userId?: number } }): number {
  const u = req.user ?? {};
  return Number(u.userId ?? u.sub);
}

async function parseRegisterPayload(req: any): Promise<{
  body: Record<string, string>;
  fotoKtp?: { file: NodeJS.ReadableStream; filename: string; mimetype: string };
}> {
  if (!req.isMultipart()) {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const body: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v != null) body[k] = String(v);
    }
    return { body };
  }

  const body: Record<string, string> = {};
  let fotoKtp: { file: NodeJS.ReadableStream; filename: string; mimetype: string } | undefined;

  for await (const part of req.parts()) {
    if (part.type === 'file' && part.fieldname === 'fotoKtp') {
      fotoKtp = {
        file: part.file,
        filename: part.filename,
        mimetype: part.mimetype,
      };
    } else if (part.type === 'field') {
      body[part.fieldname] = String(part.value);
    }
  }

  return { body, fotoKtp };
}

async function saveRegisterFotoKtp(
  userId: number,
  foto: { file: NodeJS.ReadableStream; filename: string; mimetype: string },
): Promise<string | null> {
  if (!foto.mimetype.startsWith('image/')) return null;
  const ext = path.extname(foto.filename || '') || '.jpg';
  const fname = `koordinator-${userId}-${Date.now()}${ext}`;
  const uploadDir = path.join(process.cwd(), 'uploads', 'ktp');
  fs.mkdirSync(uploadDir, { recursive: true });
  const dest = path.join(uploadDir, fname);
  await pipeline(foto.file, fs.createWriteStream(dest));
  return `/uploads/ktp/${fname}`;
}

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

  app.get('/password-status', { preHandler: [app.authenticate] }, async (req) => {
    const userId = jwtUserId(req);
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginAt: true, passwordHash: true },
    });
    if (!row) return { isDefaultPassword: false };
    const isDefaultPassword = await isDefaultPasswordUser(row);
    return { isDefaultPassword };
  });

  app.post('/change-password', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, string>;
    const currentPassword = String(body.currentPassword ?? '');
    const newPassword = String(body.newPassword ?? '');
    const confirmPassword = String(body.confirmPassword ?? '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return reply.code(400).send({ error: 'Semua field password wajib diisi' });
    }

    const validationError = validateNewPassword(currentPassword, newPassword, confirmPassword);
    if (validationError) {
      return reply.code(400).send({ error: validationError });
    }

    const userId = jwtUserId(req);
    const row = await prisma.user.findUnique({ where: { id: userId } });
    if (!row) return reply.code(404).send({ error: 'Pengguna tidak ditemukan' });

    const currentOk = await bcrypt.compare(currentPassword, row.passwordHash);
    if (!currentOk) {
      return reply.code(400).send({ error: 'Password lama tidak sesuai' });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    await writeAuditLog({
      userId,
      action: 'auth.password_changed',
      ipAddress: req.ip ?? 'unknown',
    });

    return { success: true, message: 'Password berhasil diubah' };
  });

  app.get('/check-code/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const row = await findActivationCode(code);
    if (!row) {
      return { valid: false, reason: 'Kode tidak ditemukan' };
    }
    const check = validateActivationCodeRow(row);
    if (!check.ok) {
      return { valid: false, reason: check.ok === false ? check.reason : 'Kode tidak valid' };
    }

    let kecamatan = '—';
    let kecamatanId: number | null = row.kecamatan_id;
    if (row.kecamatan_id) {
      const kec = await prisma.kecamatan.findUnique({
        where: { id: row.kecamatan_id },
        select: { id: true, nama: true },
      });
      if (kec) {
        kecamatan = kec.nama;
        kecamatanId = kec.id;
      }
    }

    return {
      valid: true,
      level: row.level,
      levelLabel: levelLabel(row.level),
      kecamatan,
      kecamatanId,
    };
  });

  app.post(
    '/register',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
          errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Terlalu banyak pendaftaran dari IP ini. Coba lagi nanti.',
          }),
        },
      },
    },
    async (req, reply) => {
    const { body: rawBody, fotoKtp } = await parseRegisterPayload(req);
    const body = rawBody as {
      nama?: string;
      noHp?: string;
      nik?: string;
      password?: string;
      confirmPassword?: string;
      activationCode?: string;
      kecamatanId?: string | number;
      kelurahanId?: string | number;
      rwId?: string | number;
      rtId?: string | number;
    };

    const nama = String(body.nama ?? '').trim();
    const activationCode = String(body.activationCode ?? '').trim();
    const nik = String(body.nik ?? '').replace(/\D/g, '');

    if (!nama || !body.noHp || !body.password || !body.confirmPassword || !activationCode) {
      return reply.code(400).send({ error: 'Semua field wajib diisi' });
    }

    if (nik && nik.length !== 16) {
      return reply.code(400).send({ error: 'NIK KTP harus 16 digit' });
    }

    const code = await findActivationCode(activationCode);
    if (!code) {
      return reply.code(400).send({ error: 'Kode aktivasi tidak valid atau sudah tidak aktif' });
    }
    const codeCheck = validateActivationCodeRow(code);
    if (!codeCheck.ok) {
      const msg = codeCheck.ok === false ? codeCheck.reason : 'Kode tidak valid';
      return reply.code(400).send({ error: msg });
    }

    const hp = normalizeNoHp(body.noHp);
    if (!hp.ok) {
      const msg = hp.ok === false ? hp.error : 'Nomor HP tidak valid';
      return reply.code(400).send({ error: msg });
    }

    if (body.password.length < 8) {
      return reply.code(400).send({ error: 'Password minimal 8 karakter' });
    }
    if (body.password !== body.confirmPassword) {
      return reply.code(400).send({ error: 'Konfirmasi password tidak cocok' });
    }

    const role = roleFromActivationLevel(code.level);
    if (!role) return reply.code(400).send({ error: 'Level kode tidak valid' });

    const kecamatanId = Number(body.kecamatanId);
    if (!kecamatanId || Number.isNaN(kecamatanId)) {
      return reply.code(400).send({ error: 'kecamatanId wajib' });
    }

    if (code.kecamatan_id && code.kecamatan_id !== kecamatanId) {
      return reply.code(400).send({ error: 'Kecamatan tidak sesuai dengan kode aktivasi' });
    }

    const kelurahanId = body.kelurahanId ? Number(body.kelurahanId) : null;
    const rwId = body.rwId ? Number(body.rwId) : null;
    const rtId = body.rtId ? Number(body.rtId) : null;

    if (code.level === 'kelurahan' && !kelurahanId) {
      return reply.code(400).send({ error: 'kelurahanId wajib untuk level ini' });
    }
    if (code.level === 'rw' && (!kelurahanId || !rwId)) {
      return reply.code(400).send({ error: 'kelurahanId dan rwId wajib untuk level ini' });
    }
    if (code.level === 'rt' && (!kelurahanId || !rwId || !rtId)) {
      return reply.code(400).send({ error: 'kelurahanId, rwId, dan rtId wajib untuk level ini' });
    }

    if (kelurahanId) {
      const kel = await prisma.kelurahan.findFirst({
        where: { id: kelurahanId, kecamatanId },
      });
      if (!kel) return reply.code(400).send({ error: 'Kelurahan tidak valid untuk kecamatan ini' });
    }
    if (rwId) {
      const rw = await prisma.rW.findFirst({
        where: { id: rwId, ...(kelurahanId ? { kelurahanId } : {}) },
      });
      if (!rw) return reply.code(400).send({ error: 'RW tidak valid' });
    }
    if (rtId) {
      const rt = await prisma.rT.findFirst({
        where: { id: rtId, ...(rwId ? { rwId } : {}) },
      });
      if (!rt) return reply.code(400).send({ error: 'RT tidak valid' });
    }

    const email = `${hp.value}@jakdata.id`;
    const existing = await prisma.user.findFirst({
      where: { OR: [{ noHp: hp.value }, { email }] },
    });
    if (existing) {
      return reply.code(409).send({ error: 'Nomor HP sudah terdaftar' });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        nama,
        email,
        noHp: hp.value,
        passwordHash,
        role: role as any,
        kecamatanId,
        kelurahanId: kelurahanId ?? undefined,
        rwId: rwId ?? undefined,
        rtId: rtId ?? undefined,
        aktif: true,
        lastLoginAt: new Date(),
      },
    });

    await incrementActivationCodeUsage(activationCode);

    let fotoKtpUrl: string | null = null;
    if (fotoKtp) {
      try {
        fotoKtpUrl = await saveRegisterFotoKtp(user.id, fotoKtp);
      } catch (err) {
        console.warn('[Auth] Gagal simpan foto KTP registrasi:', err);
      }
    }

    const nikHash = nik ? crypto.createHash('sha256').update(nik).digest('hex') : null;

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

    await writeAuditLog({
      userId: user.id,
      action: 'auth.register',
      ipAddress: req.ip ?? 'unknown',
      newValues: {
        email,
        role,
        kecamatanId,
        nikHash,
        nikLast4: nik ? nik.slice(-4) : null,
        fotoKtpUrl,
      },
    });

    return {
      success: true,
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
        kecamatanId: user.kecamatanId,
        kelurahanId: user.kelurahanId,
        rwId: user.rwId,
        rtId: user.rtId,
      },
    };
  });
}
