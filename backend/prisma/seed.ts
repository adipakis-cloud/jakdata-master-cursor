import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const pad = (n: number, l = 3) => String(n).padStart(l, '0');

async function main() {
  console.log('Seeding JAKDATA operational intelligence sample data...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  const provinsi = await prisma.provinsi.upsert({
    where: { kode: 'DKI' },
    update: { nama: 'DKI Jakarta' },
    create: { nama: 'DKI Jakarta', kode: 'DKI' },
  });

  const kota = await prisma.kota.upsert({
    where: { kode: 'JAKBAR' },
    update: { nama: 'Jakarta Barat', tipe: 'kota' },
    create: { provinsiId: provinsi.id, nama: 'Jakarta Barat', kode: 'JAKBAR', tipe: 'kota' },
  });

  const kecamatan = await prisma.kecamatan.upsert({
    where: { kotaId_nama: { kotaId: kota.id, nama: 'Cengkareng' } },
    update: {},
    create: { kotaId: kota.id, nama: 'Cengkareng', kode: '317301' },
  });

  const kelurahan = await prisma.kelurahan.upsert({
    where: { kecamatanId_nama: { kecamatanId: kecamatan.id, nama: 'Kapuk' } },
    update: { kodePos: '11720' },
    create: { kecamatanId: kecamatan.id, nama: 'Kapuk', kode: '3173011001', kodePos: '11720' },
  });

  const rw = await prisma.rW.upsert({
    where: { kelurahanId_nomor: { kelurahanId: kelurahan.id, nomor: '001' } },
    update: { namaKetua: 'Bapak Hendra RW' },
    create: { kelurahanId: kelurahan.id, nomor: '001', namaKetua: 'Bapak Hendra RW', noHpKetua: '081200000001' },
  });

  const rtIds: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const rt = await prisma.rT.upsert({
      where: { rwId_nomor: { rwId: rw.id, nomor: pad(i) } },
      update: { targetWarga: 10 },
      create: { rwId: rw.id, nomor: pad(i), namaKetua: `Ketua RT ${pad(i)}`, noHpKetua: `08120000000${i}`, targetWarga: 10 },
    });
    rtIds.push(rt.id);
  }

  const admin = await prisma.user.upsert({
    where: { email: 'admin@jakdata.id' },
    update: { passwordHash, role: 'admin_pusat', aktif: true },
    create: { nama: 'Administrator JAKDATA', email: 'admin@jakdata.id', passwordHash, role: 'admin_pusat' },
  });

  const petugas = await prisma.user.upsert({
    where: { email: 'petugas.rt001@jakdata.id' },
    update: { rtId: rtIds[0], role: 'petugas_lapangan', aktif: true },
    create: {
      nama: 'Petugas RT 001',
      email: 'petugas.rt001@jakdata.id',
      passwordHash: await bcrypt.hash('petugas123', 10),
      role: 'petugas_lapangan',
      rtId: rtIds[0],
    },
  });

  await prisma.user.upsert({
    where: { email: 'kordin.rw001@jakdata.id' },
    update: { rwId: rw.id, role: 'koordinator_rw', aktif: true },
    create: {
      nama: 'Koordinator RW 001',
      email: 'kordin.rw001@jakdata.id',
      passwordHash: await bcrypt.hash('petugas123', 10),
      role: 'koordinator_rw',
      rwId: rw.id,
    },
  });

  await prisma.wilayahAssignment.upsert({
    where: { id: 1 },
    update: { userId: petugas.id, level: 'rt', rtId: rtIds[0], status: 'aktif', assignedBy: admin.id },
    create: { userId: petugas.id, level: 'rt', rtId: rtIds[0], status: 'aktif', assignedBy: admin.id },
  });

  const keluarga = await prisma.keluarga.upsert({
    where: { noKkHash: 'seed-kk-hash-001' },
    update: { rtId: rtIds[0], namaKepala: 'Ahmad Fauzi', statusEkonomi: 'rentan', updatedBy: admin.id },
    create: {
      rtId: rtIds[0],
      namaKepala: 'Ahmad Fauzi',
      noKkHash: 'seed-kk-hash-001',
      noKkEncrypted: 'sample-encrypted-kk',
      noHpKepala: '081211110001',
      alamatDetail: 'Jl. Kapuk Raya Gg. Mawar No. 7',
      jumlahAnggota: 4,
      jumlahTanggungan: 2,
      statusRumah: 'kontrak',
      statusEkonomi: 'rentan',
      totalPenghasilan: 3200000,
      totalPengeluaran: 2850000,
      skorPrioritasBantuan: 78,
      kategoriBAntuan: 'prioritas',
      terdaftarProgram: ['bpnt'],
      verificationStatus: 'verified',
      verifiedBy: admin.id,
      verifiedAt: new Date(),
      createdBy: admin.id,
    },
  });

  const warga = await prisma.warga.upsert({
    where: { nikHash: 'seed-nik-ahmad-001' },
    update: { kkId: keluarga.id, statusEkonomi: 'rentan', diverifikasi: true, verifiedBy: admin.id },
    create: {
      rtId: rtIds[0],
      kkId: keluarga.id,
      nama: 'Ahmad Fauzi',
      nikHash: 'seed-nik-ahmad-001',
      nikEncrypted: 'sample-encrypted-nik',
      noHp: '081211110001',
      jenisKelamin: 'L',
      tempatLahir: 'Jakarta',
      tanggalLahir: new Date('1986-04-17'),
      agama: 'Islam',
      statusPerkawinan: 'kawin',
      hubunganKeluarga: 'kepala_keluarga',
      alamat: 'Jl. Kapuk Raya Gg. Mawar No. 7',
      pekerjaan: 'Pedagang',
      pendidikanTerakhir: 'SMA',
      penghasilanEst: 3200000,
      statusEkonomi: 'rentan',
      kategori: 'warga_umkm',
      statusWarga: 'aktif',
      verificationStatus: 'verified',
      diverifikasi: true,
      verifiedBy: admin.id,
      verifiedAt: new Date(),
      consentDataAt: new Date(),
      createdBy: admin.id,
    },
  });

  await prisma.keluarga.update({
    where: { id: keluarga.id },
    data: { kepalaWargaId: warga.id },
  });

  await prisma.wargaIdentity.upsert({
    where: { wargaId: warga.id },
    update: { verificationStatus: 'verified' },
    create: {
      wargaId: warga.id,
      nomorKkHash: 'seed-kk-hash-001',
      nomorKkEncrypted: 'sample-encrypted-kk',
      bpjsKesehatanMasked: '000126********01',
      documentRefs: [{ type: 'ktp', file: 'sample-ktp-ahmad.jpg' }],
      verificationStatus: 'verified',
      verifiedAt: new Date(),
    },
  });

  const anggota = [
    { nama: 'Siti Rahayu', nikHash: 'seed-nik-siti-002', gender: 'P', rel: 'pasangan', birth: '1988-08-21' },
    { nama: 'Dewi Fauziah', nikHash: 'seed-nik-dewi-003', gender: 'P', rel: 'anak', birth: '2013-01-10' },
    { nama: 'Rafi Fauzi', nikHash: 'seed-nik-rafi-004', gender: 'L', rel: 'anak', birth: '2017-09-05' },
  ] as const;

  for (const item of anggota) {
    await prisma.warga.upsert({
      where: { nikHash: item.nikHash },
      update: { kkId: keluarga.id },
      create: {
        rtId: rtIds[0],
        kkId: keluarga.id,
        nama: item.nama,
        nikHash: item.nikHash,
        jenisKelamin: item.gender,
        tanggalLahir: new Date(item.birth),
        hubunganKeluarga: item.rel,
        alamat: 'Jl. Kapuk Raya Gg. Mawar No. 7',
        statusEkonomi: 'rentan',
        kategori: 'warga_biasa',
        verificationStatus: 'verified',
        diverifikasi: true,
        verifiedBy: admin.id,
        verifiedAt: new Date(),
        createdBy: admin.id,
      },
    });
  }

  const umkm = await prisma.umkm.upsert({
    where: { kodeUmkm: 'UMKM-KPK-001' },
    update: { omzetBulanan: 18500000, status: 'aktif' },
    create: {
      kodeUmkm: 'UMKM-KPK-001',
      namaUsaha: 'Dapur Kue Bu Siti',
      sektor: 'kuliner',
      skala: 'mikro',
      status: 'aktif',
      ownerWargaId: warga.id,
      namaPemilik: 'Siti Rahayu',
      noHp: '081211110002',
      kecamatanId: kecamatan.id,
      kelurahanId: kelurahan.id,
      rwId: rw.id,
      rtId: rtIds[0],
      alamat: 'Jl. Kapuk Raya Gg. Mawar No. 7',
      jumlahPekerja: 2,
      omzetBulanan: 18500000,
      modalBerjalan: 4500000,
      kebutuhan: 'Akses bahan baku tepung dan minyak harga stabil',
      riskScore: 32,
      createdBy: admin.id,
    },
  });

  const warung = await prisma.warung.upsert({
    where: { kodeWarung: 'WRG-KPK-001' },
    update: { stokKritis: true, omzetHarianEst: 650000 },
    create: {
      kodeWarung: 'WRG-KPK-001',
      namaWarung: 'Warung Sembako Pak Ahmad',
      tipeWarung: 'warung_sembako',
      status: 'aktif',
      ownerWargaId: warga.id,
      namaPemilik: 'Ahmad Fauzi',
      noHp: '081211110001',
      kecamatanId: kecamatan.id,
      kelurahanId: kelurahan.id,
      rwId: rw.id,
      rtId: rtIds[0],
      alamat: 'Jl. Kapuk Raya Gg. Mawar No. 8',
      jumlahPekerja: 1,
      omzetHarianEst: 650000,
      stokKritis: true,
      kebutuhan: 'Pasokan beras dan minyak dengan pembayaran tempo',
      createdBy: admin.id,
    },
  });

  const warmindo = await prisma.warmindoOutlet.upsert({
    where: { kodeOutlet: 'WRM-KPK-001' },
    update: { status: 'aktif', aktif: true },
    create: {
      kodeOutlet: 'WRM-KPK-001',
      namaOutlet: 'Warmindo Kapuk Mandiri',
      kecamatanId: kecamatan.id,
      kelurahanId: kelurahan.id,
      rwId: rw.id,
      rtId: rtIds[1],
      alamat: 'Jl. Kapuk Raya No. 12',
      status: 'aktif',
      modalAwal: 20000000,
      targetOmzetHarian: 1000000,
      targetLabaBulanan: 3000000,
      biayaSewaBulanan: 1500000,
      karyawanTotal: 3,
      managerUserId: admin.id,
      tanggalBuka: new Date('2026-03-01'),
      createdBy: admin.id,
    },
  });

  const supplier = await prisma.supplier.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000101' },
    update: { aktif: true },
    create: {
      uuid: '00000000-0000-0000-0000-000000000101',
      nama: 'Koperasi Pangan Cengkareng',
      role: 'supplier',
      kontakNama: 'Ibu Mira',
      noHp: '081299990001',
      alamat: 'Pasar Cengkareng Blok A',
      komoditas: ['beras', 'minyak', 'telur', 'mie'],
      rating: 4.5,
    },
  });

  await prisma.supplyChainLink.create({
    data: {
      supplierId: supplier.id,
      warungId: warung.id,
      komoditas: 'beras medium',
      satuan: 'kg',
      hargaAcuan: 12500,
      leadTimeHari: 1,
      minimumOrder: 25,
      reliabilityScore: 0.86,
      catatan: 'Pasokan prioritas untuk warung dengan stok kritis.',
    },
  }).catch(() => undefined);

  await prisma.supplyChainLink.create({
    data: {
      supplierId: supplier.id,
      warmindoId: warmindo.id,
      komoditas: 'mie instan karton',
      satuan: 'karton',
      hargaAcuan: 96000,
      leadTimeHari: 2,
      minimumOrder: 5,
      reliabilityScore: 0.9,
    },
  }).catch(() => undefined);

  await prisma.warmindoInventory.upsert({
    where: { warmindoId_namaBahan: { warmindoId: warmindo.id, namaBahan: 'Mie Instan (Karton)' } },
    update: { stokSaatIni: 4, stokMinimum: 5, supplierId: supplier.id },
    create: {
      warmindoId: warmindo.id,
      namaBahan: 'Mie Instan (Karton)',
      sku: 'MIE-KTN',
      satuan: 'karton',
      stokSaatIni: 4,
      stokMinimum: 5,
      hargaBeli: 96000,
      hargaJual: 3500,
      supplierId: supplier.id,
    },
  });

  await prisma.localBusinessTransaction.upsert({
    where: { kodeTransaksi: 'TRX-UMKM-KPK-001' },
    update: { totalAmount: 450000 },
    create: {
      kodeTransaksi: 'TRX-UMKM-KPK-001',
      transactionType: 'penjualan',
      umkmId: umkm.id,
      kategori: 'kuliner',
      deskripsi: 'Penjualan kue basah ke acara RW',
      quantity: 60,
      satuan: 'pcs',
      totalAmount: 450000,
      paymentMethod: 'qris',
      items: [{ nama: 'kue basah', qty: 60, harga: 7500 }],
      marginEst: 140000,
      recordedBy: admin.id,
    },
  });

  await prisma.localBusinessTransaction.upsert({
    where: { kodeTransaksi: 'TRX-WRG-KPK-001' },
    update: { totalAmount: 1200000 },
    create: {
      kodeTransaksi: 'TRX-WRG-KPK-001',
      transactionType: 'pembelian',
      warungId: warung.id,
      supplierId: supplier.id,
      kategori: 'sembako',
      deskripsi: 'Pembelian beras dan minyak untuk stok warung',
      quantity: 1,
      satuan: 'paket',
      totalAmount: 1200000,
      paymentMethod: 'tempo',
      items: [{ nama: 'beras medium', qty: 50, satuan: 'kg' }, { nama: 'minyak goreng', qty: 24, satuan: 'liter' }],
      recordedBy: admin.id,
    },
  });

  await prisma.warmindoTransaksi.create({
    data: {
      warmindoId: warmindo.id,
      totalOmzet: 875000,
      totalHpp: 568750,
      grossProfit: 306250,
      jumlahItem: 52,
      metodeBayar: 'qris',
      items: [{ nama: 'Mie goreng telur', qty: 35, harga: 15000 }],
      kasirId: admin.id,
    },
  }).catch(() => undefined);

  const bantuan = await prisma.bantuan.upsert({
    where: { kodeProgram: 'BANSOS-KAPUK-001' },
    update: { stokTersisa: 49, aktif: true },
    create: {
      kodeProgram: 'BANSOS-KAPUK-001',
      nama: 'Sembako Kapuk Prioritas',
      tipe: 'sembako',
      deskripsi: 'Paket beras, minyak, gula, dan protein untuk keluarga rentan.',
      satuan: 'paket',
      nilaiPerSatuan: 175000,
      stokTotal: 50,
      stokTersisa: 49,
      sumber: 'JAKDATA Program',
      tanggalMasuk: new Date(),
      createdBy: admin.id,
    },
  });

  await prisma.bantuanPenerima.create({
    data: {
      bantuanId: bantuan.id,
      keluargaId: keluarga.id,
      wargaId: warga.id,
      namaPenerima: warga.nama,
      rtId: rtIds[0],
      jumlahDiterima: 1,
      nilaiDiterima: 175000,
      status: 'diterima',
      tanggalDiterima: new Date(),
      verificationStatus: 'verified',
      catatan: 'Contoh penerima bantuan prioritas.',
    },
  }).catch(() => undefined);

  const laporan = await prisma.laporanWarga.upsert({
    where: { kodeLaporan: 'JAK-2026-SEED-001' },
    update: { status: 'diproses', assignedTo: petugas.id },
    create: {
      kodeLaporan: 'JAK-2026-SEED-001',
      channelType: 'whatsapp',
      namaPelapor: 'Ibu Sari',
      noHpPelapor: '081233330001',
      isiLaporan: 'Harga beras naik dan beberapa warung mulai kosong stok.',
      kategori: 'ekonomi',
      subkategori: 'harga_pangan',
      urgencyLevel: 'high',
      lokasiText: 'RW 001 Kelurahan Kapuk',
      provinsiId: provinsi.id,
      kotaId: kota.id,
      kecamatanId: kecamatan.id,
      kelurahanId: kelurahan.id,
      rwId: rw.id,
      rtId: rtIds[0],
      status: 'diproses',
      aiSummary: 'Warga melaporkan kenaikan harga beras dan stok warung menipis.',
      aiRecommendation: 'Pantau stok warung, hubungkan dengan supplier, dan siapkan bantuan pangan untuk keluarga rentan.',
      assignedTo: petugas.id,
      createdBy: admin.id,
    },
  });

  await prisma.laporanMessage.create({
    data: {
      laporanId: laporan.id,
      senderType: 'admin',
      messageText: 'Laporan masuk sebagai sampel operasional pangan RW 001.',
      isInternal: true,
      createdBy: admin.id,
    },
  }).catch(() => undefined);

  const fieldReport = await prisma.fieldReport.upsert({
    where: { kodeReport: 'FR-KAPUK-001' },
    update: { status: 'diproses', assignedTo: petugas.id },
    create: {
      kodeReport: 'FR-KAPUK-001',
      reportType: 'monitoring_warung',
      title: 'Monitoring stok warung RW 001',
      description: 'Petugas mencatat stok beras rendah di warung sembako Pak Ahmad.',
      urgencyLevel: 'high',
      status: 'diproses',
      provinsiId: provinsi.id,
      kotaId: kota.id,
      kecamatanId: kecamatan.id,
      kelurahanId: kelurahan.id,
      rwId: rw.id,
      rtId: rtIds[0],
      warungId: warung.id,
      evidence: { stokBerasKg: 8, kebutuhanNormalKg: 30 },
      assignedTo: petugas.id,
      createdBy: petugas.id,
    },
  });

  await prisma.publicSentiment.deleteMany({ where: { externalRef: { startsWith: 'seed:' } } });
  await prisma.publicSentiment.create({
    data: {
      source: 'laporan_warga',
      externalRef: 'seed:sentiment:kapuk:pangan',
      polarity: 'negative',
      intensityScore: 0.72,
      topic: 'harga_pangan',
      message: 'Warga khawatir stok beras warung habis menjelang akhir pekan.',
      keywords: ['beras', 'stok', 'warung', 'harga'],
      provinsiId: provinsi.id,
      kotaId: kota.id,
      kecamatanId: kecamatan.id,
      kelurahanId: kelurahan.id,
      rwId: rw.id,
      rtId: rtIds[0],
      laporanWargaId: laporan.id,
    },
  });

  await prisma.areaRiskScore.deleteMany({ where: { generatedBy: 'seed' } });
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const riskScore = await prisma.areaRiskScore.create({
    data: {
      riskCategory: 'ekonomi',
      wilayahLevel: 'rw',
      provinsiId: provinsi.id,
      kotaId: kota.id,
      kecamatanId: kecamatan.id,
      kelurahanId: kelurahan.id,
      rwId: rw.id,
      score: 68,
      scorePrevious: 44,
      confidence: 0.81,
      drivers: [
        { signal: 'stok_warung_kritis', weight: 0.35 },
        { signal: 'sentimen_negatif_pangan', weight: 0.25 },
        { signal: 'laporan_harga_pangan', weight: 0.4 },
      ],
      recommendations: ['Aktifkan pasokan koperasi pangan', 'Prioritaskan keluarga rentan untuk paket sembako'],
      periodStart: sevenDaysAgo,
      periodEnd: today,
      generatedBy: 'seed',
    },
  });

  const anomaly = await prisma.anomaly.upsert({
    where: { kodeAnomaly: 'ANM-KAPUK-STOK-001' },
    update: { status: 'open', severity: 'high' },
    create: {
      kodeAnomaly: 'ANM-KAPUK-STOK-001',
      anomalyType: 'stok_menipis',
      severity: 'high',
      status: 'open',
      title: 'Stok pangan warung menipis',
      description: 'Stok beras warung di RW 001 turun di bawah kebutuhan normal.',
      evidence: { warungId: warung.id, stokBerasKg: 8, thresholdKg: 20 },
      provinsiId: provinsi.id,
      kotaId: kota.id,
      kecamatanId: kecamatan.id,
      kelurahanId: kelurahan.id,
      rwId: rw.id,
      rtId: rtIds[0],
      areaRiskScoreId: riskScore.id,
      assignedTo: petugas.id,
      createdBy: admin.id,
    },
  });

  const alert = await prisma.operationalAlert.upsert({
    where: { kodeAlert: 'ALT-KAPUK-PANGAN-001' },
    update: { status: 'open', anomalyId: anomaly.id },
    create: {
      kodeAlert: 'ALT-KAPUK-PANGAN-001',
      alertType: 'supply_chain',
      title: 'Stok pangan RW 001 perlu intervensi',
      message: 'Warung sampel mencatat stok beras kritis dan laporan warga menunjukkan kekhawatiran harga pangan.',
      severity: 'high',
      status: 'open',
      provinsiId: provinsi.id,
      kotaId: kota.id,
      kecamatanId: kecamatan.id,
      kelurahanId: kelurahan.id,
      rwId: rw.id,
      rtId: rtIds[0],
      laporanWargaId: laporan.id,
      fieldReportId: fieldReport.id,
      anomalyId: anomaly.id,
      source: 'seed',
      metadata: { suggestedAction: 'Hubungkan warung dengan Koperasi Pangan Cengkareng' },
      escalatedTo: petugas.id,
      createdBy: admin.id,
    },
  });

  await prisma.aiRecommendationLog.create({
    data: {
      useCase: 'operational_alert_triage',
      modelUsed: 'seed-rule-engine',
      promptVersion: 'seed-v1',
      inputRefType: 'operational_alert',
      inputRefId: alert.id,
      operationalAlertId: alert.id,
      anomalyId: anomaly.id,
      areaRiskScoreId: riskScore.id,
      inputData: { alertCode: alert.kodeAlert, riskScore: riskScore.score },
      recommendation: {
        priority: 'high',
        actions: [
          'Verifikasi stok warung dalam 24 jam',
          'Aktifkan supplier koperasi untuk beras medium',
          'Siapkan kuota bantuan sembako untuk KK rentan',
        ],
      },
      rationale: 'Sinyal stok kritis, sentimen negatif, dan laporan warga terjadi pada wilayah yang sama.',
      status: 'proposed',
      confidence: 0.82,
      createdBy: admin.id,
    },
  }).catch(() => undefined);

  await prisma.rolePermission.createMany({
    data: [
      { role: 'admin_pusat', permission: 'wilayah.manage', description: 'Kelola struktur wilayah dan assignment.' },
      { role: 'petugas_lapangan', permission: 'field_report.create', description: 'Membuat laporan lapangan.' },
      { role: 'data_analyst', permission: 'risk_score.read', description: 'Membaca risk score dan anomali.' },
    ],
    skipDuplicates: true,
  });

  const counts = await prisma.$transaction([
    prisma.provinsi.count(),
    prisma.kota.count(),
    prisma.kecamatan.count(),
    prisma.kelurahan.count(),
    prisma.rW.count(),
    prisma.rT.count(),
    prisma.keluarga.count(),
    prisma.warga.count(),
    prisma.umkm.count(),
    prisma.warung.count(),
    prisma.warmindoOutlet.count(),
    prisma.operationalAlert.count(),
  ]);

  console.log('Seed complete:');
  console.log(`- provinsi/kota/kecamatan/kelurahan/RW/RT: ${counts.slice(0, 6).join('/')}`);
  console.log(`- keluarga/warga: ${counts[6]}/${counts[7]}`);
  console.log(`- UMKM/warung/warmindo: ${counts[8]}/${counts[9]}/${counts[10]}`);
  console.log(`- operational alerts: ${counts[11]}`);
  console.log('- demo login: admin@jakdata.id / admin123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
