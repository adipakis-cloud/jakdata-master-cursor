import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import path from 'path';
import fs from 'fs';

import { authRoutes } from './modules/auth/auth.routes';
import { activationRoutes } from './modules/auth/activation.routes';
import { setupActivationCodes } from './lib/setupActivationCodes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { wilayahRoutes } from './modules/wilayah/wilayah.routes';
import { wargaRoutes } from './modules/warga/warga.routes';
import { laporanRoutes } from './modules/laporan/laporan.routes';
import { warmindoRoutes } from './modules/warmindo/warmindo.routes';
import { bantuanRoutes } from './modules/bantuan/bantuan.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { tpsRoutes, officialRoutes, usersRoutes, adminUsersRoutes } from './modules/tps/tps.routes';
import { koordinatorRoutes } from './modules/koordinator/koordinator.routes';
import { securityPlugin } from './modules/security/security';
import { startAiWorker } from './workers/ai.worker';
import { startScheduler } from './workers/scheduler';
import { startWhatsappAI } from './ai/modules/whatsapp-ai/whatsapp.service';
import { startEmailAI } from './ai/modules/email-ai/email.service';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: any, reply: any) => Promise<void>;
  }
}

const app = Fastify({ logger: { level: 'warn' }, trustProxy: true });

function corsOriginAllowed(origin: string | undefined): boolean {
  const allowed = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
      process.env.COMMAND_URL,
  ].filter(Boolean) as string[];
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  if (/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  return false;
}

async function bootstrap() {
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '15 minutes',
    allowList: ['127.0.0.1'],
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Terlalu banyak permintaan. Coba lagi dalam 15 menit.',
    }),
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (corsOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'jakdata_dev_CHANGE_IN_PRODUCTION' });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 5 } });

  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  await app.register(staticPlugin, { root: uploadDir, prefix: '/uploads/' });

  await app.register(securityPlugin);

  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  });

  app.setErrorHandler((error, request, reply) => {
    if (reply.sent) return;
    const isDev = process.env.NODE_ENV !== 'production';
    request.log.error({
      err: error,
      url: request.url,
      method: request.method,
      userId: (request.user as any)?.userId,
    });

    const statusCode = (error as any).statusCode;
    if (statusCode && statusCode < 500) {
      return reply.status(statusCode).send({
        error: error.message,
        statusCode,
      });
    }

    return reply.status(500).send({
      error: 'Terjadi kesalahan internal server.',
      statusCode: 500,
      ...(isDev && { detail: error.message, stack: error.stack }),
    });
  });

  app.decorate('authenticate', async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Token tidak valid. Silakan login ulang.' });
    }
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(activationRoutes, { prefix: '/api/admin/activation-codes' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(wilayahRoutes, { prefix: '/api/wilayah' });
  await app.register(wargaRoutes, { prefix: '/api/warga' });
  await app.register(laporanRoutes, { prefix: '/api/laporan' });
  await app.register(warmindoRoutes, { prefix: '/api/warmindo' });
  await app.register(bantuanRoutes, { prefix: '/api/bantuan' });
  await app.register(aiRoutes, { prefix: '/api/ai' });
  await app.register(tpsRoutes, { prefix: '/api/tps' });
  await app.register(officialRoutes, { prefix: '/api/official' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(adminUsersRoutes, { prefix: '/api/admin/users' });

  await app.register(koordinatorRoutes, { prefix: '/api/koordinator' });

  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: 'jakdata-field-trial-v0.1',
  }));


  // Serve WhatsApp QR code
  app.get('/wa-qr', async (_req, reply) => {
    const qrPath = require('path').join(process.cwd(), 'wa-qr.png');
    if (require('fs').existsSync(qrPath)) {
      return reply.type('image/png').send(require('fs').readFileSync(qrPath));
    }
    return reply.code(404).send({ error: 'QR not ready yet' });
  });
  app.get('/health', async () => ({
    status: 'ok',
    version: '3.0',
    time: new Date().toISOString(),
    ai: !!process.env.ANTHROPIC_API_KEY,
  }));

  const port = Number(process.env.PORT ?? 3001);
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`\n✅ JAKDATA API v3.0 — Port ${port}\n`);

    setupActivationCodes().catch((err) =>
      console.warn('[Setup] Activation codes:', (err as Error).message),
    );

    if (process.env.ENABLE_AI_WORKERS !== 'false') {
      try { startAiWorker(); } catch (e) { console.warn("[AI Worker] Dinonaktifkan:", (e as any).message); }
      startScheduler();
      startEmailAI();
      if (process.env.ENABLE_WHATSAPP !== 'false') { startWhatsappAI().catch((err) => console.error('[WhatsApp AI] Gagal start:', err)); } else { console.log('[WhatsApp AI] Dinonaktifkan via env'); }
    }
  } catch (err: any) {
    if (err?.code === 'EADDRINUSE') {
      console.error(
        `\n❌ Port ${port} sudah dipakai. Hentikan proses lain, lalu jalankan ulang.\n` +
          `   PowerShell: Get-NetTCPConnection -LocalPort ${port} | Select-Object -Property OwningProcess,LocalPort\n` +
          `   Stop-Process -Id <PID> -Force\n` +
          `   Atau: npm run dev:stop\n`,
      );
      process.exit(1);
    }
    throw err;
  }
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});








