# JAKDATA — FIELD TRIAL CHECKLIST

## STARTUP COMMANDS

```powershell
# Backend
cd D:\Random\App\JAKDATA_MASTER_CURSOR\backend
npx prisma generate
npm run build
npm run start

# Frontend
cd D:\Random\App\JAKDATA_MASTER_CURSOR\frontend
npm run build
npm run preview -- --host 0.0.0.0 --port 5173
```

## TEST ACCOUNTS

| Email | Password | Role | Expected Dashboard |
|---|---|---|---|
| admin@jakdata.id | admin123 | Admin Pusat | /admin |
| koordinator.kecamatan@jakdata.id | admin123 | Koordinator Kec | /field |
| koordinator.kelurahan@jakdata.id | admin123 | Koordinator Kel | /field |
| koordinator.rw@jakdata.id | admin123 | Koordinator RW | /field |
| koordinator.rt@jakdata.id | admin123 | Koordinator RT | /field |
| petugas@jakdata.id | admin123 | Petugas | /field |
| warmindo@jakdata.id | admin123 | Warmindo | /warmindo |

## ROUTES TO TEST ON HP (MOBILE)

- [ ] Login halaman terbuka di HP via LAN
- [ ] Login admin → redirect ke /admin (bukan /field)
- [ ] Login koordinator.rt → redirect ke /field
- [ ] /field menampilkan hanya menu lapangan
- [ ] Buat laporan berfungsi (form + submit)
- [ ] Status laporan tampil sesuai wilayah sendiri
- [ ] Upload foto berfungsi dari kamera HP
- [ ] Akses /admin dari akun field → tampil pesan error
- [ ] Akses /field dari akun admin → tampil pesan error
- [ ] API /api/warga dari field user → hanya data wilayah sendiri

## KNOWN LIMITATIONS (FIELD TRIAL v0.1)

- AI features belum aktif
- Notifikasi push belum aktif
- Offline mode belum aktif (butuh koneksi LAN)
- Data masih seed kecil (120 warga, 1 RW, 2 RT)
- Foto upload ke local storage (bukan cloud)

## ROLLBACK COMMANDS

```powershell
# Jika backend crash:
cd D:\Random\App\JAKDATA_MASTER_CURSOR\backend
npm run build && npm run start

# Jika database corrupt:
$env:SEED_MODE="small"
$env:SEED_WARGA_CAP="120"
npm run db:seed
```

## ESCALATION

Jika ada error saat field trial:

1. Screenshot error message
2. Catat: akun yang dipakai, menu yang dibuka, aksi yang dilakukan
3. Cek backend terminal untuk stack trace
