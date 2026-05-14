# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
JAKDATA is a civic data management system for Jakarta. Monorepo with `backend/` (Fastify + TypeScript + Prisma) and `frontend/` (React + Vite + Tailwind). See `README.md` for full feature list.

### Services

| Service | Port | Start command |
|---------|------|---------------|
| PostgreSQL 16 | 5432 | `sudo pg_ctlcluster 16 main start` |
| Backend (Fastify) | 3001 | `cd backend && npm run dev` |
| Frontend (Vite) | 3000 | `cd frontend && npm run dev` |

### Starting the dev environment

1. Start PostgreSQL: `sudo pg_ctlcluster 16 main start`
2. Start backend: `cd backend && npm run dev` (requires `backend/.env` with `DATABASE_URL`)
3. Start frontend: `cd frontend && npm run dev`

The frontend Vite config proxies `/api` and `/uploads` to `localhost:3001`, so no CORS issues in dev.

### Database

- Prisma schema lives at `backend/prisma/schema.prisma` (also duplicated at root `prisma/schema.prisma`).
- To reset and reseed: `cd backend && npx prisma db push --accept-data-loss && npx ts-node --transpile-only prisma/seed.ts`
- DB credentials (dev): user=`jakdata`, password=`jakdata_secret_2026`, database=`jakdata`

### Testing credentials

| Role | Email | Password |
|------|-------|----------|
| Admin Pusat | admin@jakdata.id | admin123 |
| Petugas RT | petugas.rt001@jakdata.id | petugas123 |
| Koordinator RW | kordin.rw001@jakdata.id | petugas123 |

### Gotchas

- The backend uses `ts-node --transpile-only` (no type checking at runtime). Run `npx tsc --noEmit` in `backend/` if you want to type-check backend code.
- There is no ESLint configured in either frontend or backend.
- There are no automated test suites (no jest/vitest/mocha). Validation is manual + TypeScript type checking + build.
- Node 20+ is required (Dockerfiles specify node:20-alpine).
- AI features (Anthropic) and WhatsApp (Fonnte) are optional; they degrade gracefully if API keys are empty.
- The `backend/.env` file must contain `DATABASE_URL` for Prisma to connect.
