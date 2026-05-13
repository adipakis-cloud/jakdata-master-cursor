import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import path from 'path';
import fs from 'fs';

import { authRoutes } from './modules/auth/auth.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { wilayahRoutes } from './modules/wilayah/wilayah.routes';
import { wargaRoutes } from './modules/warga/warga.routes';
import { laporanRoutes } from './modules/laporan/laporan.routes';
import { warmindoRoutes } from './modules/warmindo/warmindo.routes';
import { bantuanRoutes } from './modules/bantuan/bantuan.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { tpsRoutes, officialRoutes, usersRoutes } from './modules/tps/tps.routes';
import { koordinatorRoutes } from './modules/koordinator/koordinator.routes';
import { securityPlugin } from './modules/security/security';

declare module 'fastify' {
  interface FastifyInstance { authenticate: (req: any, reply: any) => Promise<void>; }
}

const app = Fastify({ logger: { level: 'warn' }, trustProxy: true });

async function bootstrap() {
  await app.register(cors, { origin: process.env.FRONTEND_URL ?? '*', credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] });
  await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'jakdata_dev_CHANGE_IN_PRODUCTION' });
  await app.register(multipart, { limits: { fileSize: 10*1024*1024, files: 5 } });

  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  await app.register(staticPlugin, { root: uploadDir, prefix: '/uploads/' });

  await app.register(securityPlugin);

  app.decorate('authenticate', async (req: any, reply: any) => {
    try { await req.jwtVerify(); }
    catch { reply.code(401).send({ error: 'Token tidak valid. Silakan login ulang.' }); }
  });

  await app.register(authRoutes,      { prefix: '/api/auth' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(wilayahRoutes,   { prefix: '/api/wilayah' });
  await app.register(wargaRoutes,     { prefix: '/api/warga' });
  await app.register(laporanRoutes,   { prefix: '/api/laporan' });
  await app.register(warmindoRoutes,  { prefix: '/api/warmindo' });
  await app.register(bantuanRoutes,   { prefix: '/api/bantuan' });
  await app.register(aiRoutes,        { prefix: '/api/ai' });
  await app.register(tpsRoutes,       { prefix: '/api/tps' });
  await app.register(officialRoutes,  { prefix: '/api/official' });
  await app.register(usersRoutes,     { prefix: '/api/users' });

  await app.register(koordinatorRoutes, { prefix: '/api/koordinator' });

  app.get('/health', async () => ({ status:'ok', version:'3.0', time: new Date().toISOString(), ai: !!process.env.ANTHROPIC_API_KEY }));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`\n✅ JAKDATA API v3.0 — Port ${port}\n`);
}

bootstrap().catch(e => { console.error(e); process.exit(1); });
