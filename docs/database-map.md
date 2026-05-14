# Database map

Authoritative schema: `backend/prisma/schema.prisma`.

The operational database uses PostgreSQL through Prisma. Table names are snake_case via `@@map`/`@map`; Prisma model names remain PascalCase.

## Core security and audit

### `users`

Application accounts and territory-scoped operators.

Major relations:

- Optional scope to `kecamatan`, `kelurahan`, `rw`, `rt`, and `warmindo_outlet`.
- Owns `refresh_tokens`, `audit_logs`, created `warga`, created/assigned `laporan_warga`, AI/design/video jobs, uploaded files, UMKM records, TPS results, and operational alerts.

Indexes:

- Email and role lookup.
- Territory scopes: `kecamatan_id`, `kelurahan_id`, `rw_id`, `rt_id`, `warmindo_id`.

### `refresh_tokens`

Hashed refresh/session tokens for a user.

Major relations:

- Required `user_id` to `users`.
- Cascades on user deletion.

### `audit_logs`

Append-only audit trail for security-sensitive actions.

Major relations:

- Optional `user_id` to `users`.
- Stores action, entity type/id, old values, new values, IP, and creation timestamp.

Indexes:

- User, action, newest-first creation time.

## Wilayah hierarchy

### `provinsi`

Top-level province records.

Major relations:

- One province has many `kota`.

### `kota`

City/regency records under a province.

Major relations:

- Required `provinsi_id` to `provinsi`.
- One kota has many `kecamatan`.

Constraints/indexes:

- Unique `kode`.
- Unique `(provinsi_id, nama)`.

### `kecamatan`

District records under a city.

Major relations:

- Required `kota_id` to `kota`.
- Has many `kelurahan`, scoped `users`, `laporan_warga`, TPS records, and election events.

Constraints/indexes:

- Unique `(kota_id, nama)`.
- Indexed `kota_id`.

### `kelurahan`

Urban village records under a district.

Major relations:

- Required `kecamatan_id` to `kecamatan`.
- Has many `rw`, scoped `users`, `laporan_warga`, `warmindo_outlet`, `tps`, and `umkm`.

Constraints/indexes:

- Unique `(kecamatan_id, nama)`.
- Indexed `kecamatan_id`.

### `rw`

Community unit records under a kelurahan.

Major relations:

- Required `kelurahan_id` to `kelurahan`.
- Has many `rt` and scoped `users`.

Constraints/indexes:

- Unique `(kelurahan_id, nomor)`.
- Indexed `kelurahan_id`.

### `rt`

Neighborhood unit records under an RW.

Major relations:

- Required `rw_id` to `rw`.
- Has many `warga`, `keluarga`, scoped `users`, `laporan_warga`, `bantuan_penerima`, `warmindo_outlet`, `tps`, and `umkm`.

Constraints/indexes:

- Unique `(rw_id, nomor)`.
- Indexed `rw_id`.

## Warga, keluarga, and UMKM

### `warga`

Individual resident records.

Major relations:

- Required `rt_id` to `rt`.
- Optional `kk_id` to `keluarga`.
- Optional `created_by` to `users`.
- Can own related `umkm` records.

Indexes:

- RT, family, creator, NIK hash, name, and soft-delete timestamp.

Audit/timestamps:

- `created_at`, `updated_at`, optional `deleted_at`.

### `keluarga`

Family/household records.

Major relations:

- Required `rt_id` to `rt`.
- Has many `warga`.
- Has many `bantuan_penerima`.

Indexes:

- RT.
- Priority score descending for assistance prioritization.

Audit/timestamps:

- `created_at`, `updated_at`.

### `umkm`

Micro/small business records for local economic operations.

Major relations:

- Optional owner `warga_id` to `warga`.
- Optional area scope to `rt` and `kelurahan`.
- Optional `created_by` to `users`.

Indexes:

- Status, category, active flag, territory, owner, creator.

Audit/timestamps:

- `created_at`, `updated_at`.

## Laporan and operational alerts

### `laporan_warga`

Resident report/ticket records.

Major relations:

- Optional scope to `rt`, `kelurahan`, and `kecamatan`.
- Optional `created_by` and `assigned_to` users.
- Has many `laporan_messages`.

Indexes:

- Status, urgency, combined status/urgency, emergency flag, territory, assignee, creator, newest-first creation time.

Audit/timestamps:

- `created_at`, `updated_at`, optional `resolved_at`.

### `laporan_messages`

Message thread entries for a resident report.

Major relations:

- Required `laporan_id` to `laporan_warga`.

Indexes:

- Report id.

### `operational_alerts`

Operational alert records for follow-up queues, data quality issues, assistance needs, and UMKM/Warmindo operations.

Major relations:

- Optional creator, acknowledger, and resolver users.
- Generic `entity_type`/`entity_id` points to the operational source record.
- Generic `wilayah_level`/`wilayah_id` stores territory context without forcing one territory table.

Indexes:

- Status, severity, category, entity reference, wilayah reference, newest-first creation time, user references.

Audit/timestamps:

- `created_at`, `updated_at`, optional `acknowledged_at`, optional `resolved_at`.

## Bantuan

### `bantuan`

Assistance program or stock records.

Major relations:

- Has many `bantuan_penerima`.

Indexes:

- Active flag.

Audit/timestamps:

- `created_at`, `updated_at`.

### `bantuan_penerima`

Assistance recipient/distribution records.

Major relations:

- Required `bantuan_id` to `bantuan`.
- Optional `keluarga_id` to `keluarga`.
- Optional `rt_id` to `rt`.

Indexes:

- Assistance, family, RT, status.

Audit/timestamps:

- `created_at`, `updated_at`, optional received timestamp.

## Warmindo operations

### `warmindo_outlet`

Warmindo outlet records for local business operations.

Major relations:

- Optional territory scope to `kelurahan` and `rt`.
- Optional manager user.
- Has many assigned users, inventory records, transactions, and expenses.

Indexes:

- Status, active flag, territory, manager.

Audit/timestamps:

- `created_at`, `updated_at`, optional open date.

### `warmindo_inventory`

Outlet inventory rows.

Major relations:

- Required `warmindo_id` to `warmindo_outlet`.

Constraints/indexes:

- Unique `(warmindo_id, nama_bahan)`.
- Indexed outlet id.

Audit/timestamps:

- `created_at`, `updated_at`.

### `warmindo_transaksi`

Sales/omzet records.

Major relations:

- Required `warmindo_id` to `warmindo_outlet`.

Indexes:

- Outlet plus newest-first transaction date.
- Newest-first transaction date.

### `warmindo_pengeluaran`

Outlet expense records.

Major relations:

- Required `warmindo_id` to `warmindo_outlet`.

Indexes:

- Outlet plus newest-first expense date.

## Files

### `files`

Metadata for uploaded files.

Major relations:

- Optional uploader user.
- Generic `entity_type`/`entity_id` links files to other tables.

Indexes:

- Entity reference.
- Uploader.

## AI and content jobs

### `ai_tasks`

Queue/status table for AI tasks.

Major relations:

- Optional creator user.

Indexes:

- Status, creator, newest-first creation time.

### `ai_reports`

Generated AI report summaries and recommendations.

Major relations:

- Uses generic `wilayah_level`/`wilayah_id` territory context.

Indexes:

- Newest-first creation time.

### `design_jobs`

AI-assisted copy/design generation jobs.

Major relations:

- Optional creator user.

Indexes:

- Status, creator.

### `video_jobs`

Video-generation job records.

Major relations:

- Optional creator user.

Indexes:

- Status, creator.

## TPS / quick count

### `election_events`

Election event setup.

Major relations:

- Optional `kecamatan_id` to `kecamatan`.
- Has many `tps` and `tps_results`.

Indexes:

- Kecamatan and status.

### `tps`

Polling station records.

Major relations:

- Required `election_id` to `election_events`.
- Optional territory scope to `rt`, `kelurahan`, and `kecamatan`.
- Has many `tps_results`.

Constraints/indexes:

- Unique `(election_id, kode_tps)`.
- Indexed election and territory fields.

### `tps_results`

Submitted quick-count results per TPS and election.

Major relations:

- Required `tps_id` to `tps`.
- Required `election_id` to `election_events`.
- Optional input and verifier users.

Constraints/indexes:

- Unique `(tps_id, election_id)`.
- Indexed election, input user, verifier, and status.

## Public official and aspirasi

### `public_officials`

Public official profile records.

Major relations:

- Has many `official_aspirasi`.

Indexes:

- Active flag and institution.

Audit/timestamps:

- `created_at`, `updated_at`.

### `official_aspirasi`

Public aspiration messages connected to an official.

Major relations:

- Required `official_id` to `public_officials`.

Indexes:

- Official and status.

Audit/timestamps:

- `created_at`, `updated_at`.

## Enums

- `UserRole`: system account roles.
- `StatusEkonomi`: resident/household economic status.
- `UrgencyLevel`: shared severity levels.
- `ReportStatus`: resident report workflow.
- `WarmindoStatus`: outlet lifecycle.
- `AiTaskStatus`: AI/content job workflow.
- `DistribusiStatus`: assistance distribution workflow.
- `UmkmStatus`: UMKM lifecycle.
- `OperationalAlertStatus`: operational alert workflow.
