# JAKDATA Security Audit — Field Trial v0.1

## Status

Date: 2026-05-14  
Build: GREEN (run `npm run build` locally after `npm install`)  
Environment: Development / Field Trial

## Implemented Controls

| Control | Status | Location |
|---|---|---|
| JWT Authentication | ✅ | `src/main.ts` (`authenticate` + `@fastify/jwt`), `src/modules/auth/auth.routes.ts` |
| Territory Scope | ✅ | `src/middleware/territoryScope.middleware.ts` |
| Rate Limiting (global 200/15min) | ✅ | `src/main.ts` (`@fastify/rate-limit`, health routes skipped) |
| Rate Limiting (login 10/15min) | ✅ | `src/modules/auth/auth.routes.ts` (`POST /login` route `config.rateLimit`) |
| CORS lockdown + LAN allow | ✅ | `src/main.ts` (`@fastify/cors` dynamic `origin`) |
| Global error handler | ✅ | `src/main.ts` (`setErrorHandler`) |
| Input sanitization | ✅ | `src/lib/sanitize.ts`; `laporan.routes.ts`, `warga.routes.ts`, `bantuan.routes.ts` |
| Security headers | ✅ | `src/main.ts` (`onSend` hook) |
| Pagination (no unbounded queries) | ✅ | `src/lib/pagination.ts` |

## Known Remaining Risks

| Risk | Severity | Plan |
|---|---|---|
| GET /api/bantuan program list global | Medium | Phase 2 |
| /bantuan/fairness partial global reads | Medium | Phase 2 |
| No file type validation on upload | Medium | Phase 2 |
| No virus scan on uploaded files | Low | Production only |
| No HTTPS (LAN HTTP only) | Medium | Production setup |
| No refresh token rotation | Low | Phase 2 |

## Field Trial Scope

This audit covers field trial v0.1 on local LAN only.  
Not approved for public internet exposure.
