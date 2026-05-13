# JAKDATA Database Foundation

`backend/prisma/schema.prisma` is the single source of truth for the JAKDATA operational intelligence v1 database. The stale root-level Prisma schema has been removed to avoid drift.

The target database is Supabase PostgreSQL. Docker is not required for daily development.

## Foundation scope

The schema is designed to support the first operational intelligence loop:

1. Maintain Jakarta wilayah hierarchy from province down to RT.
2. Register households and residents with verification, demographic, and privacy-aware identity fields.
3. Track social assistance inventory and recipient distribution.
4. Monitor local economic actors: UMKM, warung, and warmindo.
5. Capture local transactions and supply-chain links.
6. Collect resident reports, field reports, public sentiment, risk scores, anomalies, and operational alerts.
7. Log AI tasks and AI recommendations so automated guidance is auditable.
8. Govern users, roles, permissions, assignments, refresh tokens, and audit logs.

## Source of truth

- Active schema: `backend/prisma/schema.prisma`
- Default development seed: `backend/prisma/seed.ts`
- Development seed alias: `backend/prisma/seed.dev.ts`
- Jakarta production territory seed: `backend/prisma/seed.jakarta.ts`

Run Prisma commands from `backend/` so Prisma resolves the backend schema:

```bash
cd backend
npm run db:generate
npm run db:push
npm run db:seed
```

## Core table groups and rationale

### Governance and audit

| Model | Why it exists |
| --- | --- |
| `User` | Application accounts with RBAC role, active status, login lockout metadata, and optional wilayah/warmindo scope. |
| `RefreshToken` | Persistent refresh-token storage with revocation and expiry tracking. |
| `RolePermission` | Declarative role-to-permission mapping for future policy checks. |
| `WilayahAssignment` | Explicit assignment history for users responsible for kecamatan, kelurahan, RW, or RT. Existing coordinator queries read `wilayah_assignments`. |
| `AuditLog` | Immutable-ish activity history for sensitive operational changes. |

### Wilayah hierarchy

| Model | Why it exists |
| --- | --- |
| `Provinsi` | Top-level province record, initially DKI Jakarta. |
| `Kota` | City/regency under province with `kota`/`kabupaten` type. |
| `Kecamatan` | District level, used for coordinator scope and area analytics. |
| `Kelurahan` | Village/urban ward level, used for resident, report, business, and alert location. |
| `RW` | Community unit below kelurahan. |
| `RT` | Smallest operating unit for field collection, residents, households, and local alerts. |

Each level has uniqueness constraints for local names/codes and indexes for parent lookups.

### Households, residents, and identity

| Model | Why it exists |
| --- | --- |
| `Keluarga` | Household/KK-level socioeconomic profile, assistance priority score, verification status, and program enrollment. |
| `Warga` | Resident-level demographics, contact, household relation, economic status, work ability, disability flag, verification status, and audit fields. |
| `WargaIdentity` | Separate sensitive identity metadata for masked/encrypted identity references, BPJS/NPWP hashes, and document references. |

The schema stores hashes/masked/encrypted identity fields rather than assuming raw NIK/KK values should be queried directly.

### Assistance/social aid

| Model | Why it exists |
| --- | --- |
| `Bantuan` | Aid program/inventory definition with stock, source, value, period, and active status. |
| `BantuanPenerima` | Distribution record connecting aid to households and/or residents, with delivery status and verification status. |

### Local economy and supply chain

| Model | Why it exists |
| --- | --- |
| `Umkm` | Micro/small/medium enterprise profile with owner, sector, location, workforce, turnover, capital, and needs. |
| `Warung` | Neighborhood shop profile, useful for pangan availability, local commerce, and stock-risk signals. |
| `WarmindoOutlet` | Managed warmindo operating unit with financial targets, manager, location, status, and active flag. |
| `WarmindoInventory` | Ingredient/item stock by warmindo, including minimum stock and supplier link. |
| `WarmindoTransaksi` | Warmindo sales transaction data for daily omzet, HPP, gross profit, cashier, and items. |
| `WarmindoPengeluaran` | Warmindo expense records for P&L. |
| `Supplier` | Supplier/distributor registry for local supply-chain monitoring. |
| `SupplyChainLink` | Links suppliers to UMKM, warung, or warmindo by commodity, price, lead time, and reliability. |
| `LocalBusinessTransaction` | Unified transaction ledger for UMKM, warung, and warmindo-related local business events. |

### Reports, alerts, sentiment, risks, anomalies, and AI logs

| Model | Why it exists |
| --- | --- |
| `LaporanWarga` | Citizen/community report ticket with channel, category, urgency, wilayah, status, assignment, AI summary, and recommendation. |
| `LaporanMessage` | Threaded messages and internal notes for resident reports. |
| `FieldReport` | Structured field-observation reports for visits, verification, business monitoring, supply chain, and incidents. |
| `OperationalAlert` | Actionable alert generated from reports, anomalies, field observations, or system/data-quality signals. |
| `PublicSentiment` | Normalized sentiment signal from reports, surveys, social channels, field visits, or news. |
| `AreaRiskScore` | Periodic risk score by wilayah and category with drivers, confidence, and recommendations. |
| `Anomaly` | Detected abnormal pattern such as duplicate aid, stock depletion, report spikes, or unusual transactions. |
| `AiTask` | Async AI job tracking for classification, scoring, analysis, and generation tasks. |
| `AiRecommendationLog` | Auditable AI recommendation output with input references, status, reviewer, and confidence. |
| `AiReport` | Generated summaries/reports for operational review. |

### Existing application modules retained

`File`, `DesignJob`, `VideoJob`, `ElectionEvent`, `Tps`, `TpsResult`, `PublicOfficial`, and `OfficialAspirasi` remain in the schema because existing backend routes reference them.

## Seed strategy

Use different seeds for different environments:

| Seed | Use |
| --- | --- |
| `npm run db:seed` | Local/dev sample: creates sample wilayah, admin/petugas users, KK/warga, UMKM, warung, warmindo, supplier links, transactions, aid, reports, alerts, sentiment, risk score, anomaly, and AI recommendation log. |
| `npm run db:seed:dev` | Alias to the same local/dev seed. |
| `npm run db:seed:jakarta` | Production-like baseline: creates Jakarta territory hierarchy and admin user without broad demo data. |

Default demo credentials from the dev seed:

| Role | Email | Password |
| --- | --- | --- |
| Admin Pusat | `admin@jakdata.id` | `admin123` |
| Petugas RT | `petugas.rt001@jakdata.id` | `petugas123` |
| Koordinator RW | `kordin.rw001@jakdata.id` | `petugas123` |

## Local runtime without Docker

### Bash/macOS/Linux

```bash
cd backend
cp ../.env.example .env
# Set DATABASE_URL to the Supabase pooled or direct PostgreSQL URL.
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

### Windows PowerShell

```powershell
Set-Location backend
Copy-Item ..\.env.example .env

# Edit .env and set DATABASE_URL to Supabase PostgreSQL.
# Example only; replace host/user/password/db with Supabase values:
# DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"

npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open a second PowerShell window:

```powershell
Set-Location frontend
npm install
npm run dev
```

PowerShell one-off command example:

```powershell
$env:DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
npx prisma validate --schema .\prisma\schema.prisma
```

## Connecting Supabase next

1. Create or choose a Supabase project.
2. Copy the direct database URL for schema pushes/migrations. Include `sslmode=require`.
3. Put the URL in `backend/.env` as `DATABASE_URL`.
4. From `backend/`, run `npm run db:generate`.
5. For early foundation sync, run `npm run db:push`.
6. Seed dev/sample data with `npm run db:seed`, or seed production territory only with `npm run db:seed:jakarta`.
7. Confirm tables in Supabase Table Editor and verify row counts for `provinsi`, `keluarga`, `warga`, `umkm`, `warung`, `warmindo_outlet`, and `operational_alerts`.

When the data model stabilizes further, switch from `db push` to tracked Prisma migrations for controlled production changes.
