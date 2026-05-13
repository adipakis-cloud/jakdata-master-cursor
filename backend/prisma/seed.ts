import { PrismaClient, StatusEkonomi } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hashPassword = (password: string) => bcrypt.hash(password, 10);
const pad = (value: number, length = 3) => String(value).padStart(length, '0');

async function seedWilayah() {
  const provinsi = await prisma.provinsi.upsert({
    where: { kode: 'DKI' },
    update: {},
    create: { nama: 'DKI Jakarta', kode: 'DKI' },
  });

  const kota = await prisma.kota.upsert({
    where: { kode: 'JAKBAR' },
    update: { nama: 'Jakarta Barat', tipe: 'kota' },
    create: { provinsiId: provinsi.id, nama: 'Jakarta Barat', kode: 'JAKBAR', tipe: 'kota' },
  });

  const kecamatan = await prisma.kecamatan.upsert({
    where: { kotaId_nama: { kotaId: kota.id, nama: 'Cengkareng' } },
    update: { kode: 'CGK' },
    create: { kotaId: kota.id, nama: 'Cengkareng', kode: 'CGK' },
  });

  const kelurahan = await prisma.kelurahan.upsert({
    where: { kecamatanId_nama: { kecamatanId: kecamatan.id, nama: 'Kapuk' } },
    update: { kode: 'KPK', kodePos: '11720' },
    create: { kecamatanId: kecamatan.id, nama: 'Kapuk', kode: 'KPK', kodePos: '11720' },
  });

  const rw = await prisma.rW.upsert({
    where: { kelurahanId_nomor: { kelurahanId: kelurahan.id, nomor: '001' } },
    update: { namaKetua: 'Bapak Ahmad Ketua RW', noHpKetua: '081200000001' },
    create: {
      kelurahanId: kelurahan.id,
      nomor: '001',
      namaKetua: 'Bapak Ahmad Ketua RW',
      noHpKetua: '081200000001',
    },
  });

  const rt = await Promise.all(
    [1, 2].map((nomor) =>
      prisma.rT.upsert({
        where: { rwId_nomor: { rwId: rw.id, nomor: pad(nomor) } },
        update: { targetWarga: 10 },
        create: {
          rwId: rw.id,
          nomor: pad(nomor),
          namaKetua: nomor === 1 ? 'Ibu Siti Ketua RT' : 'Pak Budi Ketua RT',
          noHpKetua: `08120000000${nomor}`,
          targetWarga: 10,
        },
      }),
    ),
  );

  return { provinsi, kota, kecamatan, kelurahan, rw, rt001: rt[0], rt002: rt[1] };
}

async function seedUsers(rtId: number, kelurahanId: number) {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@jakdata.id' },
    update: { role: 'admin_pusat', aktif: true },
    create: {
      nama: 'Administrator JAKDATA',
      email: 'admin@jakdata.id',
      passwordHash: await hashPassword('admin123'),
      role: 'admin_pusat',
    },
  });

  const petugas = await prisma.user.upsert({
    where: { email: 'petugas.rt001@jakdata.id' },
    update: { rtId, aktif: true },
    create: {
      nama: 'Petugas RT 001',
      email: 'petugas.rt001@jakdata.id',
      passwordHash: await hashPassword('petugas123'),
      role: 'petugas_lapangan',
      rtId,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager.umkm@jakdata.id' },
    update: { kelurahanId, aktif: true },
    create: {
      nama: 'Manager UMKM Kapuk',
      email: 'manager.umkm@jakdata.id',
      passwordHash: await hashPassword('manager123'),
      role: 'manager_warmindo',
      kelurahanId,
    },
  });

  return { admin, petugas, manager };
}

async function upsertWargaByName(data: {
  rtId: number;
  kkId?: number;
  nama: string;
  noHp: string;
  jenisKelamin: string;
  pekerjaan: string;
  statusEkonomi: StatusEkonomi;
  createdBy: number;
}) {
  const existing = await prisma.warga.findFirst({ where: { rtId: data.rtId, nama: data.nama } });

  if (existing) {
    return prisma.warga.update({
      where: { id: existing.id },
      data: {
        kkId: data.kkId,
        noHp: data.noHp,
        jenisKelamin: data.jenisKelamin,
        pekerjaan: data.pekerjaan,
        statusEkonomi: data.statusEkonomi,
        diverifikasi: true,
      },
    });
  }

  return prisma.warga.create({
    data: {
      ...data,
      kategori: 'warga_biasa',
      diverifikasi: true,
      alamat: 'Jl. Kapuk Raya, RW 001',
    },
  });
}

async function seedWarga(rtId: number, createdBy: number) {
  const keluarga = await prisma.keluarga.upsert({
    where: { noKk: '3174010101010001' },
    update: {
      rtId,
      namaKepala: 'Ahmad Fauzi',
      statusEkonomi: 'rentan',
      kategoriBantuan: 'prioritas',
    },
    create: {
      rtId,
      namaKepala: 'Ahmad Fauzi',
      noKk: '3174010101010001',
      noHpKepala: '081211110001',
      jumlahAnggota: 4,
      jumlahTanggungan: 2,
      statusRumah: 'kontrak',
      statusEkonomi: 'rentan',
      totalPenghasilan: 2500000,
      skorPrioritasBantuan: 78,
      kategoriBantuan: 'prioritas',
      terdaftarProgram: ['sembako'],
    },
  });

  const warga = await Promise.all([
    upsertWargaByName({
      rtId,
      kkId: keluarga.id,
      nama: 'Ahmad Fauzi',
      noHp: '081211110001',
      jenisKelamin: 'L',
      pekerjaan: 'Pedagang nasi uduk',
      statusEkonomi: 'rentan',
      createdBy,
    }),
    upsertWargaByName({
      rtId,
      kkId: keluarga.id,
      nama: 'Siti Rahayu',
      noHp: '081211110002',
      jenisKelamin: 'P',
      pekerjaan: 'Penjahit rumahan',
      statusEkonomi: 'rentan',
      createdBy,
    }),
    upsertWargaByName({
      rtId,
      kkId: keluarga.id,
      nama: 'Budi Santoso',
      noHp: '081211110003',
      jenisKelamin: 'L',
      pekerjaan: 'Ojek online',
      statusEkonomi: 'sedang',
      createdBy,
    }),
  ]);

  return { keluarga, warga };
}

async function seedUmkm(params: {
  rtId: number;
  kelurahanId: number;
  wargaId: number;
  createdBy: number;
}) {
  const umkm = await prisma.umkm.upsert({
    where: { kodeUmkm: 'UMKM-KPK-001' },
    update: {
      status: 'aktif',
      omzetBulananEst: 8500000,
      jumlahKaryawan: 2,
      aktif: true,
    },
    create: {
      kodeUmkm: 'UMKM-KPK-001',
      namaUsaha: 'Nasi Uduk Kapuk Berkah',
      pemilikNama: 'Ahmad Fauzi',
      wargaId: params.wargaId,
      rtId: params.rtId,
      kelurahanId: params.kelurahanId,
      kategori: 'kuliner',
      produkUtama: 'Nasi uduk dan lauk rumahan',
      status: 'aktif',
      omzetBulananEst: 8500000,
      jumlahKaryawan: 2,
      noHp: '081211110001',
      alamat: 'Jl. Kapuk Raya, RW 001',
      createdBy: params.createdBy,
    },
  });

  const warmindo = await prisma.warmindoOutlet.upsert({
    where: { kodeOutlet: 'WRM-KPK-001' },
    update: {
      status: 'aktif',
      kelurahanId: params.kelurahanId,
      rtId: params.rtId,
      aktif: true,
    },
    create: {
      kodeOutlet: 'WRM-KPK-001',
      namaOutlet: 'Warmindo Kapuk Produktif',
      kelurahanId: params.kelurahanId,
      rtId: params.rtId,
      alamat: 'Jl. Kapuk Raya No. 12',
      status: 'aktif',
      modalAwal: 20000000,
      targetOmzetHarian: 1000000,
      targetLabaBulanan: 3000000,
      biayaSewaBulanan: 1500000,
      karyawanTotal: 3,
      tanggalBuka: new Date('2026-01-10T00:00:00.000Z'),
    },
  });

  await Promise.all(
    [
      { namaBahan: 'Mie Instan Karton', satuan: 'karton', stokSaatIni: 18, stokMinimum: 5, hargaBeli: 95000, hargaJual: 3500 },
      { namaBahan: 'Telur Ayam', satuan: 'kg', stokSaatIni: 10, stokMinimum: 3, hargaBeli: 27000, hargaJual: 3000 },
      { namaBahan: 'Gas LPG 3kg', satuan: 'tabung', stokSaatIni: 4, stokMinimum: 2, hargaBeli: 20000, hargaJual: 0 },
    ].map((item) =>
      prisma.warmindoInventory.upsert({
        where: { warmindoId_namaBahan: { warmindoId: warmindo.id, namaBahan: item.namaBahan } },
        update: item,
        create: { warmindoId: warmindo.id, ...item },
      }),
    ),
  );

  const transaksiTanggal = new Date('2026-05-13T08:00:00.000Z');
  const existingTransaksi = await prisma.warmindoTransaksi.findFirst({
    where: { warmindoId: warmindo.id, tanggal: transaksiTanggal },
  });
  const transaksiData = {
    tanggal: transaksiTanggal,
    totalOmzet: 920000,
    totalHpp: 598000,
    grossProfit: 322000,
    jumlahItem: 62,
    items: [{ nama: 'Mie goreng telur', qty: 32, harga: 15000 }],
    catatan: 'Sample omzet harian untuk local runtime.',
  };

  if (existingTransaksi) {
    await prisma.warmindoTransaksi.update({
      where: { id: existingTransaksi.id },
      data: transaksiData,
    });
  } else {
    await prisma.warmindoTransaksi.create({
      data: {
        warmindoId: warmindo.id,
        ...transaksiData,
      },
    });
  }

  return { umkm, warmindo };
}

async function seedOperationalSamples(params: {
  rtId: number;
  kelurahanId: number;
  createdBy: number;
  keluargaId: number;
  warmindoId: number;
}) {
  const bantuanData = {
    nama: 'Sembako Prioritas Lokal',
    tipe: 'sembako',
    deskripsi: 'Paket beras, minyak, gula, dan protein untuk keluarga prioritas.',
    satuan: 'paket',
    nilaiPerSatuan: 175000,
    stokTotal: 50,
    stokTersisa: 47,
    sumber: 'Program JAKDATA Lokal',
    tanggalMasuk: new Date('2026-05-01T00:00:00.000Z'),
    aktif: true,
  };
  const existingBantuan = await prisma.bantuan.findFirst({
    where: { nama: bantuanData.nama },
  });
  const bantuan = existingBantuan
    ? await prisma.bantuan.update({ where: { id: existingBantuan.id }, data: bantuanData })
    : await prisma.bantuan.create({ data: bantuanData });

  const penerimaData = {
    keluargaId: params.keluargaId,
    namaPenerima: 'Ahmad Fauzi',
    rtId: params.rtId,
    jumlahDiterima: 1,
    status: 'terjadwal' as const,
    catatan: 'Sample distribusi bantuan untuk local runtime.',
  };
  const existingPenerima = await prisma.bantuanPenerima.findFirst({
    where: { bantuanId: bantuan.id, keluargaId: params.keluargaId, namaPenerima: penerimaData.namaPenerima },
  });

  if (existingPenerima) {
    await prisma.bantuanPenerima.update({
      where: { id: existingPenerima.id },
      data: penerimaData,
    });
  } else {
    await prisma.bantuanPenerima.create({
      data: {
        bantuanId: bantuan.id,
        ...penerimaData,
      },
    });
  }

  const laporan = await prisma.laporanWarga.upsert({
    where: { kodeLaporan: 'JAK-2026-SEED-001' },
    update: {
      status: 'baru',
      urgencyLevel: 'high',
      kelurahanId: params.kelurahanId,
      rtId: params.rtId,
    },
    create: {
      kodeLaporan: 'JAK-2026-SEED-001',
      channelType: 'web',
      namaPelapor: 'Ibu Siti Ketua RT',
      noHpPelapor: '081200000001',
      isiLaporan: 'Dua keluarga prioritas perlu verifikasi bantuan sembako minggu ini.',
      kategori: 'bantuan',
      subkategori: 'verifikasi_prioritas',
      urgencyLevel: 'high',
      lokasiText: 'RT 001 RW 001 Kapuk',
      rtId: params.rtId,
      kelurahanId: params.kelurahanId,
      status: 'baru',
      aiSummary: 'Verifikasi bantuan sembako untuk keluarga prioritas.',
      aiRecommendation: 'Petugas lapangan melakukan kunjungan dan memperbarui status keluarga.',
      createdBy: params.createdBy,
    },
  });

  await prisma.operationalAlert.upsert({
    where: { kodeAlert: 'OPS-KPK-001' },
    update: {
      status: 'open',
      severity: 'high',
      entityId: laporan.id,
      wilayahId: params.rtId,
    },
    create: {
      kodeAlert: 'OPS-KPK-001',
      kategori: 'bantuan',
      severity: 'high',
      status: 'open',
      judul: 'Verifikasi bantuan prioritas tertunda',
      deskripsi: 'Sample alert untuk memantau tindak lanjut laporan bantuan warga.',
      source: 'seed',
      entityType: 'laporan_warga',
      entityId: laporan.id,
      wilayahLevel: 'rt',
      wilayahId: params.rtId,
      metadata: { kodeLaporan: laporan.kodeLaporan },
      createdBy: params.createdBy,
    },
  });

  await prisma.operationalAlert.upsert({
    where: { kodeAlert: 'OPS-KPK-002' },
    update: {
      status: 'open',
      severity: 'medium',
      entityId: params.warmindoId,
      wilayahId: params.kelurahanId,
    },
    create: {
      kodeAlert: 'OPS-KPK-002',
      kategori: 'umkm',
      severity: 'medium',
      status: 'open',
      judul: 'Warmindo perlu cek stok minimum',
      deskripsi: 'Sample alert operasional untuk stok bahan baku UMKM/Warmindo.',
      source: 'seed',
      entityType: 'warmindo_outlet',
      entityId: params.warmindoId,
      wilayahLevel: 'kelurahan',
      wilayahId: params.kelurahanId,
      metadata: { indikator: 'stok_minimum' },
      createdBy: params.createdBy,
    },
  });

  return { bantuan, laporan };
}

async function main() {
  console.log('Seeding local JAKDATA operational foundation...');

  const wilayah = await seedWilayah();
  const users = await seedUsers(wilayah.rt001.id, wilayah.kelurahan.id);
  const warga = await seedWarga(wilayah.rt001.id, users.admin.id);
  const umkm = await seedUmkm({
    rtId: wilayah.rt001.id,
    kelurahanId: wilayah.kelurahan.id,
    wargaId: warga.warga[0].id,
    createdBy: users.admin.id,
  });
  await seedOperationalSamples({
    rtId: wilayah.rt001.id,
    kelurahanId: wilayah.kelurahan.id,
    createdBy: users.admin.id,
    keluargaId: warga.keluarga.id,
    warmindoId: umkm.warmindo.id,
  });

  const [wilayahCount, wargaCount, umkmCount, alertCount] = await Promise.all([
    prisma.rT.count(),
    prisma.warga.count(),
    prisma.umkm.count(),
    prisma.operationalAlert.count(),
  ]);

  console.log('Seed complete.');
  console.log(`RT: ${wilayahCount}`);
  console.log(`Warga: ${wargaCount}`);
  console.log(`UMKM: ${umkmCount}`);
  console.log(`Operational alerts: ${alertCount}`);
  console.log('Demo login: admin@jakdata.id / admin123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
