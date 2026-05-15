# JAKDATA database production foundation

This document describes the territory hierarchy, role-based access patterns, indexing approach, and seeding strategy implemented for scaling coordinators and large resident datasets.

## Schema decisions

- **Territory spine**: `Provinsi` → `Kota` → `Kecamatan` → `Kelurahan` → `RW` → `RT`. Operational entities attach at **RT** (`Warga`, `Keluarga`, `BantuanPenerima.rtId`, etc.) or duplicate denormalized links on `LaporanWarga` (`rtId`, `kelurahanId`, `kecamatanId`) for reporting filters.
- **Users**: `UserRole` enum plus nullable foreign keys `kotaId`, `kecamatanId`, `kelurahanId`, `rwId`, `rtId`, `warmindoId` for strict assignment (one primary territory anchor per coordinator tier).
- **Warmindo**: `WarmindoOutlet` links optional `kelurahanId` and `rtId` so outlets align with wilayah and RT-scoped APIs.
- **Alerts / intelligence**: `OperationalAlert` and `TerritorialStressSignal` use `wilayahLevel` + `wilayahId` for keyed filtering alongside RT-scoped queries.

## Territory hierarchy

| Level      | Model       | Notes |
|-----------|-------------|--------|
| Provinsi  | `Provinsi`  | DKI seed uses single provinsi row. |
| Kota/Kab  | `Kota`      | `tipe` distinguishes kota/kabupaten. |
| Kecamatan | `Kecamatan` | Scoped for `admin_kecamatan`, `koordinator_kecamatan`. |
| Kelurahan | `Kelurahan` | Scoped for `admin_kelurahan`, `koordinator_kelurahan`. |
| RW        | `RW`        | Scoped for `koordinator_rw`. |
| RT        | `RT`        | Atomic field unit for warga/keluarga and most list filters. |

## Role access rules

Resolution is centralized in `resolveVisibleRtIds` and list helpers in `security.ts`:

- **admin_pusat**, **auditor**, **finance_admin**: unrestricted (`null` RT list = all).
- **admin_kota**: all RT under `user.kotaId`.
- **admin_kecamatan**, **koordinator_kecamatan**: RT under `user.kecamatanId`.
- **admin_kelurahan**, **koordinator_kelurahan**: RT under `user.kelurahanId`.
- **koordinator_rw**: RT under `user.rwId`.
- **koordinator_rt**, **petugas_lapangan**: single `user.rtId`.
- **manager_warmindo**, **kasir_warmindo**: no RT list; warmindo routes use `warmindoId` and outlet OR (`rtId` / `kelurahanId` from visible RT set for admin-style roles).

Helpers in `territoryScope.ts`: `getUserTerritoryScope`, `buildTerritoryWhere`, `assertCanAccessTerritory`, `applyTerritoryFilter`, plus `buildWilayahKeyedListWhere` for `wilayahLevel` / `wilayahId` tables.

## Indexing strategy

Composite and single-column indexes on Prisma models support:

- Wilayah navigation: parent ids, type, kode.
- Warga/keluarga: `rtId` with `deletedAt`, `createdAt`, economic status.
- Laporan: `status` + time, `rtId`/`kelurahanId`/`kecamatanId` + `status`.
- Bantuan distribution: `rtId` + `status`, `bantuanId` + `status`.
- Warmindo: `kelurahanId` + `status`, `createdAt`.
- AI / ops: `AiTask` status + time; `OperationalAlert` severity + status; `wilayahLevel` + `wilayahId` + `status`.
- Users: `role` combined with territory fk columns.

## Scale strategy

- **API**: All list endpoints use `resolveVisibleRtIds` or derived `where` fragments; empty scope maps to impossible id (`id: -1`) to avoid accidental global reads.
- **Seed**: `SEED_MODE`, `SEED_WARGA_CAP`, `SEED_RT_CAP`, `SEED_RW_CAP`, batched `createMany` for warga, throttled progress logs, Supabase-safe pool URL and P1017 retries (`withDbRetry`), `prisma.$disconnect` in `finally`.

## Seed commands

```bash
cd backend
npx prisma generate
SEED_MODE=small npm run db:seed
SEED_MODE=medium npm run db:seed
SEED_MODE=production SEED_WARGA_CAP=8000 npm run db:seed
npm run build
```

On Windows PowerShell use `$env:SEED_MODE="small"; npm run db:seed`.

## Remaining gaps

- **Laporan** has no `kotaId`; kota-level admins rely on resolved RT ids only.
- **Bantuan** master catalog is still global read; only penerima/fairness views are territory-scoped.
- **AI memory** routes (`/ai/memory`, `/ai/reports`) remain broad read for authenticated users; tighten when product defines sensitivity.
- **Migrations**: production deploy should use `prisma migrate` against reviewed SQL; this repo may still use `db push` in dev.
- **Redis / rate limits**: login rate limiting remains in-memory (`security.ts`).
