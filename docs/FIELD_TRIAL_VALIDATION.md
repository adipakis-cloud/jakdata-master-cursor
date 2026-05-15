# JAKDATA — Field Trial Validation (Static Read)

Generated from repository read-through (no live API run in CI here).  
Re-run checks after seed + servers: `powershell -ExecutionPolicy Bypass -File backend/scripts/validate-field-trial.ps1`

## STEP 1 — Configuration snapshot

### `backend/src/main.ts`

- **Rate limit:** `@fastify/rate-limit` registered globally (`max: 200`, `timeWindow: 15 minutes`). Note: `allowList: ['127.0.0.1']` may exempt localhost from counting; rate-limit headers are asserted in the script via **`GET /api/warga`** (authenticated), not only `/api/health`.
- **CORS:** `@fastify/cors` with `corsOriginAllowed`: localhost ports, `FRONTEND_URL`, and `http://192.168.*.*` LAN pattern.
- **Error handler:** `setErrorHandler` — client-safe 500 in production; `<500` returns message + statusCode.
- **Security headers:** `onSend` sets `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`.

### `territoryScope.middleware.ts`

- Governance (`admin_pusat`, `auditor`, `finance_admin`): `scopeFilter` / `territoryPrisma` null.
- Warmindo roles: require `warmindoId`; attach `scopeFilter.warmindoId`.
- Others: require resolvable territory FK chain; attach `territoryPrisma` (`warga` / `laporan` fragments).

### Seeded accounts (from `prisma/seed.ts` + `computeWilayahMeta` rules)

`wilayahId` / `wilayahType` in **login JSON** follow `computeWilayahMeta` (lowest FK: `rtId` → `rwId` → `kelurahanId` → `kecamatanId` → `kotaId` → `warmindoId`).

| Email | Role | Territory FKs (seed) | Typical `wilayahId` / `wilayahType` |
|--------|------|------------------------|-------------------------------------|
| admin@jakdata.id | admin_pusat | none | `null` / `null` |
| admin.kota@jakdata.id | admin_kota | kotaId | kota id / `KOTA` |
| admin.kecamatan@jakdata.id | admin_kecamatan | kecamatanId | kecamatan id / `KECAMATAN` |
| admin.kelurahan@jakdata.id | admin_kelurahan | kelurahanId | kelurahan id / `KELURAHAN` |
| koordinator.kecamatan@jakdata.id | koordinator_kecamatan | kecamatanId | kecamatan id / `KECAMATAN` |
| koordinator.kelurahan@jakdata.id | koordinator_kelurahan | kelurahanId | kelurahan id / `KELURAHAN` |
| koordinator.rw@jakdata.id | koordinator_rw | rwId + kelurahanId + kecamatanId | rw id / `RW` |
| koordinator.rt@jakdata.id | koordinator_rt | rtId + rwId + … | rt id / `RT` |
| petugas@jakdata.id | petugas_lapangan | same RT as seed | rt id / `RT` |
| auditor@jakdata.id | auditor | none | `null` / `null` |
| finance@jakdata.id | finance_admin | none | `null` / `null` |
| warmindo@jakdata.id | manager_warmindo | warmindoId + kelurahanId | warmindo outlet id / `WARMINDO` |
| kasir.warmindo@jakdata.id | kasir_warmindo | warmindoId | warmindo outlet id / `WARMINDO` |

### Field frontend — obvious runtime risks

- **`FieldListWargaRoute`:** `useEffect([debounced])` calls `fetchW` without listing `fetchW` in deps (acceptable for trial; watch stale closure if `fetchW` ever depends on more state).
- **`WilayahBadge` / `rtInfo`:** Users with **`rwId` only** (no `rtId`) may show `RT —` until `/wilayah/rt` data is wired; badge still shows RW / kelurahan from `AuthStorage` IDs.
- **`/field/upload`:** Route exists but is **not** in bottom nav (direct URL only).
- **`keluarga/list`:** Backend returns `{ data, total, ... }`; no field UI dependency found—admin only if used later.

## How to run automated checks

```powershell
cd D:\Random\App\JAKDATA_MASTER_CURSOR\backend
# Ensure API is up: npm run dev  (or start) on port 3001, DB seeded
powershell -ExecutionPolicy Bypass -File scripts/validate-field-trial.ps1
```

Optional:

```powershell
.\scripts\validate-field-trial.ps1 -BaseUrl "http://192.168.1.10:3001"
```

## Manual HP checklist (short)

- [ ] Open SPA from LAN origin allowed by CORS.
- [ ] Login each matrix account; confirm `redirectTo` matches role.
- [ ] RT user: warga + laporan lists load; totals look small vs admin.
- [ ] Create laporan + optional photo upload from `/field/laporan/baru`.
