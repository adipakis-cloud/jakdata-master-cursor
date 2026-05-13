import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding JAKDATA database...');

  // Provinsi
  const dki = await prisma.provinsi.upsert({
    where: { kode: 'DKI' },
    update: {},
    create: { nama: 'DKI Jakarta', kode: 'DKI' },
  });

  // Kota
  const jakbar = await prisma.kota.upsert({
    where: { kode: 'JAKBAR' },
    update: {},
    create: { provinsiId: dki.id, nama: 'Jakarta Barat', kode: 'JAKBAR' },
  });
  const jakut = await prisma.kota.upsert({
    where: { kode: 'JAKUT' },
    update: {},
    create: { provinsiId: dki.id, nama: 'Jakarta Utara', kode: 'JAKUT' },
  });

  // Kecamatan
  const cengkareng = await prisma.kecamatan.upsert({
    where: { kotaId_nama: { kotaId: jakbar.id, nama: 'Cengkareng' } },
    update: {},
    create: { kotaId: jakbar.id, nama: 'Cengkareng', kode: 'CEK' },
  });
  const tanjungPriok = await prisma.kecamatan.upsert({
    where: { kotaId_nama: { kotaId: jakut.id, nama: 'Tanjung Priok' } },
    update: {},
    create: { kotaId: jakut.id, nama: 'Tanjung Priok', kode: 'TJP' },
  });

  // Kelurahan
  const kapuk = await prisma.kelurahan.upsert({
    where: { kecamatanId_nama: { kecamatanId: cengkareng.id, nama: 'Kapuk' } },
    update: {},
    create: { kecamatanId: cengkareng.id, nama: 'Kapuk', kode: 'KPK' },
  });
  const cengkarengBarat = await prisma.kelurahan.upsert({
    where: { kecamatanId_nama: { kecamatanId: cengkareng.id, nama: 'Cengkareng Barat' } },
    update: {},
    create: { kecamatanId: cengkareng.id, nama: 'Cengkareng Barat', kode: 'CEB' },
  });

  // RW & RT
  const rw001 = await prisma.rW.upsert({
    where: { kelurahanId_nomor: { kelurahanId: kapuk.id, nomor: '001' } },
    update: {},
    create: { kelurahanId: kapuk.id, nomor: '001', namaKetua: 'Pak Darmo' },
  });
  const rw002 = await prisma.rW.upsert({
    where: { kelurahanId_nomor: { kelurahanId: kapuk.id, nomor: '002' } },
    update: {},
    create: { kelurahanId: kapuk.id, nomor: '002', namaKetua: 'Bu Siti' },
  });

  const rt001 = await prisma.rT.upsert({
    where: { rwId_nomor: { rwId: rw001.id, nomor: '001' } },
    update: {},
    create: { rwId: rw001.id, nomor: '001', namaKetua: 'Pak Wahyu' },
  });
  const rt002 = await prisma.rT.upsert({
    where: { rwId_nomor: { rwId: rw001.id, nomor: '002' } },
    update: {},
    create: { rwId: rw001.id, nomor: '002', namaKetua: 'Bu Erna' },
  });
  const rt003 = await prisma.rT.upsert({
    where: { rwId_nomor: { rwId: rw002.id, nomor: '001' } },
    update: {},
    create: { rwId: rw002.id, nomor: '001', namaKetua: 'Pak Rudi' },
  });

  // Users
  const adminHash = await bcrypt.hash('admin123', 10);
  const petugasHash = await bcrypt.hash('petugas123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@jakdata.id' },
    update: {},
    create: {
      nama: 'Administrator JAKDATA',
      email: 'admin@jakdata.id',
      passwordHash: adminHash,
      role: 'admin_pusat',
    },
  });

  await prisma.user.upsert({
    where: { email: 'petugas.rt001@jakdata.id' },
    update: {},
    create: {
      nama: 'Petugas RT 001 Kapuk',
      email: 'petugas.rt001@jakdata.id',
      passwordHash: petugasHash,
      role: 'petugas_lapangan',
      rtId: rt001.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'kordin.rw001@jakdata.id' },
    update: {},
    create: {
      nama: 'Koordinator RW 001 Kapuk',
      email: 'kordin.rw001@jakdata.id',
      passwordHash: petugasHash,
      role: 'koordinator_rw',
      rwId: rw001.id,
    },
  });

  // Sample warga (untuk demo)
  const sampleWarga = [
    { nama: 'Ahmad Fauzi', noHp: '081200001', kategori: 'warga_biasa' },
    { nama: 'Siti Rahayu', noHp: '081200002', kategori: 'penerima_bantuan' },
    { nama: 'Budi Santoso', noHp: '081200003', kategori: 'warga_biasa' },
    { nama: 'Dewi Lestari', noHp: '081200004', kategori: 'warga_biasa' },
    { nama: 'Hendra G.', noHp: '081200005', kategori: 'warga_biasa' },
    { nama: 'Rina Wulandari', noHp: '081200006', kategori: 'penerima_bantuan' },
    { nama: 'Joko Susilo', noHp: '081200007', kategori: 'pekerja_warmindo' },
    { nama: 'Nur Hasanah', noHp: '081200008', kategori: 'warga_biasa' },
  ];

  for (const w of sampleWarga) {
    await prisma.warga.create({ data: { rtId: rt001.id, ...w } }).catch(() => {});
  }

  // Sample laporan
  await prisma.laporanWarga.upsert({
    where: { kodeLaporan: 'JAK-2026-00001' },
    update: {},
    create: {
      kodeLaporan: 'JAK-2026-00001',
      channelType: 'whatsapp',
      namaPelapor: 'Ibu Sari',
      noHpPelapor: '081234567890',
      isiLaporan: 'Rumah kebanjiran di RT 001 RW 001, anak-anak belum makan.',
      kategori: 'bencana',
      subkategori: 'banjir',
      urgencyLevel: 'critical',
      isEmergency: true,
      lokasiText: 'RT 001 RW 001 Kapuk',
      rtId: rt001.id,
      aiSummary: 'Laporan banjir disertai kondisi keluarga tanpa makan di RT 001.',
      aiRecommendation: 'Segera kirim tim evakuasi dan distribusi makanan ke RT 001 RW 001.',
      createdBy: admin.id,
    },
  });

  await prisma.laporanWarga.upsert({
    where: { kodeLaporan: 'JAK-2026-00002' },
    update: {},
    create: {
      kodeLaporan: 'JAK-2026-00002',
      channelType: 'web',
      namaPelapor: 'Pak Hendra',
      noHpPelapor: '081298765432',
      isiLaporan: 'Ada anak usia 12 tahun putus sekolah karena orang tua tidak mampu bayar.',
      kategori: 'pendidikan',
      subkategori: 'anak_putus_sekolah',
      urgencyLevel: 'high',
      lokasiText: 'RT 002 RW 001 Kapuk',
      aiSummary: 'Anak putus sekolah usia 12 tahun karena kendala ekonomi.',
      aiRecommendation: 'Koordinasikan dengan Dinas Pendidikan untuk program beasiswa.',
      createdBy: admin.id,
    },
  });

  // Warmindo
  const warmindo1 = await prisma.warmindoOutlet.upsert({
    where: { kodeOutlet: 'WRM-CEK-KPK-001' },
    update: {},
    create: {
      kodeOutlet: 'WRM-CEK-KPK-001',
      namaOutlet: 'Warmindo Kapuk 1',
      kelurahanId: kapuk.id,
      rtId: rt001.id,
      alamat: 'Jl. Kapuk Raya No. 12',
      status: 'aktif',
      modalAwal: 20000000,
      targetOmzetHarian: 1000000,
      targetLabaBulanan: 3000000,
      biayaSewaBulanan: 1500000,
      karyawanTotal: 3,
    },
  });

  // Inventory
  const bahanPokok = [
    { namaBahan: 'Mie Instan (Karton)', satuan: 'karton', stokSaatIni: 15, stokMinimum: 5, hargaBeli: 95000, hargaJual: 3500 },
    { namaBahan: 'Telur Ayam', satuan: 'kg', stokSaatIni: 8, stokMinimum: 3, hargaBeli: 25000, hargaJual: 2500 },
    { namaBahan: 'Beras', satuan: 'kg', stokSaatIni: 20, stokMinimum: 10, hargaBeli: 12000, hargaJual: 0 },
    { namaBahan: 'Minyak Goreng', satuan: 'liter', stokSaatIni: 6, stokMinimum: 2, hargaBeli: 15000, hargaJual: 0 },
    { namaBahan: 'Air Mineral (Dus)', satuan: 'dus', stokSaatIni: 3, stokMinimum: 5, hargaBeli: 18000, hargaJual: 3000 },
  ];

  for (const b of bahanPokok) {
    await prisma.warmindoInventory.upsert({
      where: { warmindoId_namaBahan: { warmindoId: warmindo1.id, namaBahan: b.namaBahan } },
      update: {},
      create: { warmindoId: warmindo1.id, ...b },
    });
  }

  // Sample transaksi
  await prisma.warmindoTransaksi.create({
    data: {
      warmindoId: warmindo1.id,
      tanggal: new Date(),
      totalOmzet: 750000,
      totalHpp: 487500,
      grossProfit: 262500,
      jumlahItem: 50,
      items: [{ nama: 'Mie Goreng', qty: 30, harga: 15000 }, { nama: 'Mie Rebus Telur', qty: 20, harga: 18000 }],
    },
  });

  // Bantuan
  const bantuanSembako = await prisma.bantuan.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nama: 'Sembako Paket A',
      tipe: 'sembako',
      deskripsi: 'Beras 5kg, minyak 1L, gula 1kg, mie 5 bungkus',
      satuan: 'paket',
      nilaiPerSatuan: 150000,
      stokTotal: 100,
      stokTersisa: 73,
      sumber: 'JAKDATA Program',
      tanggalMasuk: new Date(),
    },
  }).catch(() => prisma.bantuan.findFirst());

  console.log('✅ Seed selesai!');
  console.log('');
  console.log('📋 Demo credentials:');
  console.log('   Admin Pusat  : admin@jakdata.id / admin123');
  console.log('   Petugas RT   : petugas.rt001@jakdata.id / petugas123');
  console.log('   Koordinator  : kordin.rw001@jakdata.id / petugas123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
