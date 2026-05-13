# JAKDATA Phase 1 Architecture Audit

Date: 2026-05-13

## 1. Current Architecture Summary

- **Backend**: Fastify TypeScript API in `backend/src`, with route modules under `backend/src/modules/*`. Prisma is configured through `backend/src/config/prisma.ts`.
- **Frontend**: Vite React app in `frontend/src`. Admin screens are under `frontend/src/pages/admin`, field screens under `frontend/src/pages/field`, and API access is centralized in `frontend/src/lib/api.ts`.
- **Database**: PostgreSQL via Prisma. The active schema is `backend/prisma/schema.prisma`; backend scripts execute Prisma from the `backend` package.
- **Auth**: JWT login in `backend/src/modules/auth/auth.routes.ts`, role and territory IDs are embedded in the token, and authenticated routes use `app.authenticate`.
- **Territory hierarchy**: `Provinsi -> Kota -> Kecamatan -> Kelurahan -> RW -> RT`, with citizens and households attached at RT level.
- **Operational modules**: warga, keluarga, laporan, bantuan, warmindo, dashboard, AI, TPS, official profile, users, and koordinator.
- **AI placement**: AI routes are backend-only under `/api/ai`; Anthropic execution is async fire-and-forget, with task data persisted in `AiTask`, `AiReport`, and design/video job tables.

## 2. Critical Problems Found

1. **Duplicate Prisma source of truth**
   - Root `prisma/schema.prisma` diverged from `backend/prisma/schema.prisma`.
   - Backend scripts use `backend/prisma`, so root schema could mislead future migrations/seeds.
   - Action taken: root stale schema/seed removed and replaced with a pointer README.

2. **Coordinator assignment table used by raw SQL but missing from schema**
   - `koordinator.routes.ts` queried `wilayah_assignments` through `$queryRaw`.
   - No Prisma model existed, so local `db push` would not create the table.
   - Action taken: added `WilayahAssignment` model and converted routes to Prisma queries.

3. **Territory scoping was inconsistent**
   - Dashboard, laporan, warga, AI recommendations, and Warmindo endpoints were partially scoped only by `rtId`.
   - Kecamatan/kelurahan/RW coordinators could see global aggregates in some places.
   - Action taken: introduced shared territory scope helpers and applied them to high-impact endpoints.

4. **Operational reports lacked real relations to territory**
   - `LaporanWarga` stored scalar `rtId`, `kelurahanId`, and `kecamatanId` without Prisma relations.
   - Action taken: added relations so query filters can traverse territory hierarchy.

5. **Local runtime documentation favored Docker**
   - README described Docker as the primary path even though local Node/Prisma is preferred for development.
   - Action taken: updated README to document local runtime and schema ownership.

## 3. Scalability Risks

- **AI job durability**: background `.catch()` tasks are not queued; process restarts can strand processing work.
- **Rate limits**: login/request limits are in-memory and not suitable for multi-instance deployment.
- **Authorization surface**: every list/detail/update endpoint needs territory-aware filters, not only dashboard summaries.
- **Denormalized territory fields**: reports store multiple territory IDs; code must keep them consistent when RT changes or data is imported.
- **Warmindo and local economy visibility**: transaction visibility exists for Warmindo, but broader UMKM/warung economy had no normalized model before this pass.
- **Operational intelligence**: alerts, sentiment, anomaly, and risk scoring need separate persistence from raw reports to avoid mixing observations with decisions.

## 4. Recommended Database Improvements

Completed in this pass:

- Keep `backend/prisma/schema.prisma` as the only active schema.
- Add `WilayahAssignment` for coordinator ownership.
- Add relations from reports, assistance recipients, and Warmindo outlets into territory tables.
- Add local economy primitives:
  - `LocalBusiness`
  - `BusinessTransaction`
  - `SupplyChainLink`
- Add intelligence primitives:
  - `OperationalAlert`
  - `PublicSentiment`
  - `AreaRiskScore`
  - `AnomalyDetection`
  - `AiRecommendation`
  - `AiOrchestrationRun`

Recommended next database pass:

- Add migrations instead of relying only on `prisma db push`.
- Normalize categorical strings into enums or reference tables for report categories, assistance types, business categories, and payment methods.
- Add data-quality constraints for territory consistency, especially report `rtId/kelurahanId/kecamatanId`.
- Add indexes for high-volume search fields once production query patterns are measured.
- Add durable AI job queue state transitions and retry metadata.

## 5. Recommended Folder Structure

```text
backend/
  prisma/
    schema.prisma
    migrations/
    seed.ts
    seed.dev.ts
    seed.jakarta.ts
  src/
    config/
    modules/
      auth/
      security/
      wilayah/
      warga/
      laporan/
      bantuan/
      warmindo/
      economy/
      intelligence/
      ai/
      dashboard/
      koordinator/
      tps/
    shared/
      authz/
      validation/
      pagination/
      audit/
frontend/
  src/
    lib/
    store/
    pages/
      admin/
      field/
    components/
    features/
      dashboard/
      wilayah/
      warga/
      laporan/
      bantuan/
      warmindo/
      economy/
      intelligence/
      ai/
docs/
  architecture-audit-phase-1.md
prisma/
  README.md
```

## 6. AI Role Placement

- **GPT reasoning role**: decision synthesis, operational recommendation generation, scenario planning.
- **Claude audit role**: structured review, anomaly explanation, policy/compliance audit, report summarization.
- **Manus execution role**: operational task execution, checklist generation, follow-up workflow automation.
- **Local AI orchestration**: should write to `AiOrchestrationRun`, then promote stable outputs into `AiRecommendation`, `OperationalAlert`, or `AreaRiskScore`.
