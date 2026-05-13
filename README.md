# JAKDATA — Sistem Data Wilayah Jakarta

**Stack:** React + Vite + Tailwind · Fastify TypeScript · Prisma · Supabase PostgreSQL

---

## 🚀 Cara Menjalankan Tanpa Docker

### Prasyarat
- Node.js dan npm
- Supabase PostgreSQL project atau PostgreSQL lain yang bisa diakses dari lokal
- Port 3000 dan 3001 tidak dipakai aplikasi lain

Docker compose masih ada untuk eksperimen legacy, tetapi bukan workflow harian.

### 1. Clone & setup environment backend

```bash
cd backend
cp ../.env.example .env
# isi DATABASE_URL dengan Supabase PostgreSQL, gunakan sslmode=require
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

### 2. Jalankan frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Akses aplikasi

| Service | URL | Keterangan |
|---------|-----|------------|
| Frontend | http://localhost:3000 | React app |
| Backend API | http://localhost:3001 | Fastify API |
| Health check | http://localhost:3001/health | Status server |

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin Pusat** | admin@jakdata.id | admin123 |
| **Petugas RT** | petugas.rt001@jakdata.id | petugas123 |
| **Koordinator RW** | kordin.rw001@jakdata.id | petugas123 |

**Admin Pusat** → Dashboard lengkap dengan semua modul
**Petugas/Koordinator** → Tampilan lapangan yang sederhana

---

## 📋 Fitur MVP yang Sudah Jalan

- ✅ Auth JWT + RBAC 10 role
- ✅ Admin dashboard: statistik, RT kurang warga, laporan critical, Warmindo
- ✅ Tampilan lapangan: tambah warga, buat laporan, list warga
- ✅ Data wilayah: RT readiness (target 10 warga per RT)
- ✅ Laporan warga: kategori, urgency, tiket otomatis, update status
- ✅ Upload foto bukti
- ✅ Warmindo: outlet, inventory, transaksi penjualan, pengeluaran, P&L
- ✅ Bantuan: stok, penerima, distribusi
- ✅ AI Command: rekomendasi otomatis + Design/Caption generator
- ✅ AI task engine (semua AI calls via backend — tidak ada API key di frontend)

---

## 🔧 Database Foundation

Database source of truth ada di:

- `backend/prisma/schema.prisma`
- Dokumentasi: `docs/database-foundation.md`
- Seed sample operasional: `backend/prisma/seed.ts`
- Seed wilayah Jakarta production-like: `backend/prisma/seed.jakarta.ts`

Root-level Prisma schema lama sudah dihapus agar tidak ada definisi database ganda.

### Windows PowerShell tanpa Docker

```powershell
Set-Location backend
Copy-Item ..\.env.example .env
# Edit .env dan isi DATABASE_URL Supabase PostgreSQL
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Terminal PowerShell kedua:

```powershell
Set-Location frontend
npm install
npm run dev
```

---

## ⚙️ Konfigurasi Produksi

Edit `.env`:

```env
JWT_SECRET=string_random_panjang_minimal_32_karakter
ANTHROPIC_API_KEY=sk-ant-...   # untuk fitur AI
FONNTE_TOKEN=...               # untuk WhatsApp notifikasi
POSTGRES_PASSWORD=password_kuat
```

---

## 📁 Struktur Folder

```
jakdata/
├── docker-compose.yml           # legacy/ops only, bukan workflow harian
├── .env.example
├── docs/
│   └── database-foundation.md # Database model, seed, Supabase, PowerShell
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Single source of truth database
│   │   ├── seed.ts            # Data sample operasional
│   │   └── seed.jakarta.ts    # Wilayah Jakarta + admin
│   └── src/
│       ├── main.ts            # Fastify server
│       ├── config/prisma.ts
│       └── modules/
│           ├── auth/          # Login, JWT, me
│           ├── dashboard/     # Summary stats
│           ├── wilayah/       # Kota, Kecamatan, Kelurahan, RW, RT
│           ├── warga/         # CRUD warga & keluarga
│           ├── laporan/       # Laporan warga + upload foto
│           ├── warmindo/      # Outlet, inventory, transaksi
│           ├── bantuan/       # Stok & distribusi bantuan
│           └── ai/            # AI task engine (Claude API)
└── frontend/
    └── src/
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── admin/         # Admin dashboard (desktop+mobile)
        │   └── field/         # Tampilan lapangan (mobile-first)
        ├── store/auth.store.ts
        └── lib/api.ts
```

---

## 🗺️ Roadmap Pengembangan

- [ ] WhatsApp webhook (Fonnte) untuk laporan masuk
- [ ] AI auto-classify laporan via Claude API
- [ ] Scoring prioritas bantuan per KK
- [ ] TPS Quick Count module
- [ ] BPS data reader
- [ ] Export laporan PDF/Excel
- [ ] Push notification (FCM)
- [ ] Offline mode untuk petugas lapangan
