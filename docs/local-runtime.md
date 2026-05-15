# Local runtime workflow (PowerShell, no Docker)

This project is prepared to run locally without Docker. Use either a local PostgreSQL server installed on the machine or a Supabase PostgreSQL project.

## 1. Environment

From the repository root:

```powershell
Copy-Item .\.env.example .\backend\.env
notepad .\backend\.env
```

Fill:

- `DATABASE_URL`: Prisma application connection.
- `DIRECT_URL`: Prisma migration/direct connection. For local PostgreSQL this can match `DATABASE_URL`.
- `JWT_SECRET`: long random string for local JWT signing.
- `SUPABASE_URL`: Supabase project URL when using Supabase.
- `SUPABASE_ANON_KEY`: Supabase anon key when using Supabase.

Local PostgreSQL example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jakdata?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/jakdata?schema=public"
JWT_SECRET="replace-with-a-long-random-local-secret"
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
```

Supabase example:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_ANON_KEY="<supabase-anon-key>"
```

## 2. Install dependencies

Backend:

```powershell
Set-Location .\backend
npm install
```

Frontend:

```powershell
Set-Location ..\frontend
npm install
```

## 3. Prisma generate

From `backend`:

```powershell
Set-Location ..\backend
npx prisma generate
```

## 4. Prisma migrate

For migration-based local development, apply the checked-in migrations:

```powershell
npx prisma migrate dev
```

For Supabase or any shared environment after migrations exist:

```powershell
npx prisma migrate deploy
```

`DATABASE_URL` can point to a Supabase pooler for application queries. `DIRECT_URL` should point to the direct database host so Prisma migrations can run safely.

## 5. Prisma db push

Use `db push` only for disposable local databases or early schema validation when you intentionally do not need migration history:

```powershell
npx prisma db push
```

If the database already has important data, prefer `prisma migrate`.

## 6. Seed Data Awal Sistem (operasional)

From `backend`:

```powershell
npm run db:seed
```

The default seed is idempotent and creates:

- wilayah referensi: DKI Jakarta -> Jakarta Barat -> Cengkareng -> Kapuk -> RW 001 -> RT 001/002
- pengguna operasional
- keluarga dan warga
- UMKM dan data operasional Warmindo
- bantuan, laporan warga, dan peringatan operasional

## 7. Run backend locally

From `backend`:

```powershell
npm run dev
```

Backend defaults to `http://localhost:3001`. Health check:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

## 8. Run frontend locally

Open a second PowerShell terminal:

```powershell
Set-Location .\frontend
npm run dev
```

Frontend defaults to `http://localhost:3000`. Vite proxies `/api` and `/uploads` to the backend at `http://localhost:3001`.

## 9. No Docker workflow

Do not run `docker compose up` for the local runtime foundation. The supported local loop is:

```powershell
# Terminal 1
Set-Location .\backend
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev

# Terminal 2
Set-Location .\frontend
npm install
npm run dev
```

Use local PostgreSQL or Supabase as the database dependency.
