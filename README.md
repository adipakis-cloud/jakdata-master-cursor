# JAKDATA — Sistem Data Wilayah Jakarta

**Stack:** React + Tailwind · Fastify TypeScript · PostgreSQL/Supabase · Prisma

---

## 🚀 Cara Menjalankan

### Prasyarat
- Node.js dan npm
- PostgreSQL lokal atau Supabase
- Port 3000 dan 3001 tidak dipakai aplikasi lain

### 1. Clone & setup environment

```bash
cp .env.example backend/.env
# Edit backend/.env sesuai database lokal atau Supabase
```

### 2. Jalankan runtime lokal tanpa Docker

Ikuti panduan PowerShell lengkap di [`docs/local-runtime.md`](docs/local-runtime.md).

### 3. Akses aplikasi

| Service | URL | Keterangan |
|---------|-----|------------|
| Frontend | http://localhost:3000 | React app |
| Backend API | http://localhost:3001 | Fastify API |
| Health check | http://localhost:3001/health | Status server |

---

## 🔑 Akun Operasional (Data Awal Sistem)

| Label | Email | Password | Peran (API) |
|-------|-------|----------|-------------|
| Admin Pusat | admin@jakdata.id | admin123 | admin_pusat |
| Koordinator Kecamatan | koordinator.kecamatan@jakdata.id | admin123 | koordinator_kecamatan |
| Koordinator Kelurahan | koordinator.kelurahan@jakdata.id | admin123 | koordinator_kelurahan |
| Koordinator RW | koordinator.rw@jakdata.id | admin123 | koordinator_rw |
| Koordinator RT | koordinator.rt@jakdata.id | admin123 | koordinator_rt |
| Petugas Lapangan | petugas@jakdata.id | admin123 | petugas_lapangan |
| Operator Warmindo | warmindo@jakdata.id | admin123 | manager_warmindo |

**Admin Pusat** → Command Center (`/admin`). **Koordinator & petugas** → Lapangan (`/field`). **Operator Warmindo** → (`/warmindo`). Sandi seed: `admin123` (ganti di produksi).

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

## 🔧 Development lokal

```bash
# Backend
cd backend
cp ../.env.example .env  # isi DATABASE_URL, DIRECT_URL, JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev

# Frontend (terminal baru)
cd frontend
npm install
npm run dev
```

---

## ⚙️ Konfigurasi Produksi

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=string_random_panjang_minimal_32_karakter
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
```

---

## 📁 Struktur Folder

```
jakdata/
├── .env.example
├── docs/
│   ├── local-runtime.md       # Workflow lokal tanpa Docker
│   └── database-map.md        # Peta tabel dan relasi database
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema authoritative
│   │   └── seed.ts            # Data awal lokal idempotent
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
