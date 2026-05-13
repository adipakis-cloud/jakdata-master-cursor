# JAKDATA — Sistem Data Wilayah Jakarta

**Stack:** React + Tailwind · Fastify TypeScript · PostgreSQL · Prisma · Docker

---

## 🚀 Cara Menjalankan

### Prasyarat
- Docker Desktop terinstall dan berjalan
- Port 3000, 3001, 5432 tidak dipakai aplikasi lain

### 1. Clone & setup environment

```bash
cp .env.example .env
# Edit .env jika perlu (opsional untuk development)
```

### 2. Jalankan semua service

```bash
docker compose up --build
```

Pertama kali build membutuhkan ±3-5 menit.

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

## 🔧 Development (tanpa Docker)

```bash
# Backend
cd backend
cp .env.example .env  # isi DATABASE_URL
npm install
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
npm run dev

# Frontend (terminal baru)
cd frontend
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
├── docker-compose.yml
├── .env.example
├── prisma/
│   ├── schema.prisma          # Database schema (25+ model)
│   └── seed.ts                # Data awal
├── backend/
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
