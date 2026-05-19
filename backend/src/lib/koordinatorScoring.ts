import type { PrismaClient } from '@prisma/client';

export interface SkorKomponen {
  dataWarga: number;
  kualitasLaporan: number;
  konsistensiAktif: number;
  validasiData: number;
  kelengkapanData: number;
  kecepatanInput: number;
  bonusKhusus: number;
  penalti: number;
}

export interface HasilScoring {
  userId: number;
  skor: number;
  bintang: number;
  level: string;
  komponen: SkorKomponen;
  rekomendasi: string[];
  totalWargaInput: number;
  totalLaporanInput: number;
  dataQualityScore: number;
}

export async function hitungSkorKoordinator(
  userId: number,
  prisma: PrismaClient,
): Promise<HasilScoring> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      rtId: true,
      rwId: true,
      kelurahanId: true,
      kecamatanId: true,
      createdAt: true,
      lastLoginAt: true,
      totalWargaInput: true,
      totalLaporanInput: true,
    },
  });

  const now = new Date();
  const komponen: SkorKomponen = {
    dataWarga: 0,
    kualitasLaporan: 0,
    konsistensiAktif: 0,
    validasiData: 0,
    kelengkapanData: 0,
    kecepatanInput: 0,
    bonusKhusus: 0,
    penalti: 0,
  };
  const rekomendasi: string[] = [];

  const wargaCount = await prisma.warga.count({
    where: { createdBy: userId, deletedAt: null },
  });

  if (wargaCount >= 50) komponen.dataWarga = 20;
  else if (wargaCount >= 30) komponen.dataWarga = 15;
  else if (wargaCount >= 15) komponen.dataWarga = 10;
  else if (wargaCount >= 5) komponen.dataWarga = 5;
  else if (wargaCount >= 1) komponen.dataWarga = 2;

  if (wargaCount < 10) rekomendasi.push('Input minimal 10 data warga untuk meningkatkan skor');

  const laporan = await prisma.laporanWarga.findMany({
    where: { createdBy: userId },
    select: { isiLaporan: true, lampiranUrls: true, urgencyLevel: true, status: true },
  });

  const laporanCount = laporan.length;
  const laporanDenganFoto = laporan.filter((l) => {
    const urls = l.lampiranUrls as string[];
    return urls && urls.length > 0;
  }).length;
  const laporanDetail = laporan.filter((l) => l.isiLaporan && l.isiLaporan.length > 50).length;

  let skorLaporan = 0;
  if (laporanCount >= 10) skorLaporan += 5;
  else if (laporanCount >= 5) skorLaporan += 3;
  else if (laporanCount >= 1) skorLaporan += 1;

  if (laporanCount > 0) {
    const pctFoto = laporanDenganFoto / laporanCount;
    if (pctFoto >= 0.7) skorLaporan += 5;
    else if (pctFoto >= 0.4) skorLaporan += 3;

    const pctDetail = laporanDetail / laporanCount;
    if (pctDetail >= 0.7) skorLaporan += 5;
    else if (pctDetail >= 0.4) skorLaporan += 3;
  }

  komponen.kualitasLaporan = Math.min(15, skorLaporan);
  if (laporanCount < 3) rekomendasi.push('Buat minimal 3 laporan untuk meningkatkan skor');

  const lastLogin = user?.lastLoginAt;
  const daysSinceLogin = lastLogin
    ? Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceLogin <= 3) komponen.konsistensiAktif = 15;
  else if (daysSinceLogin <= 7) komponen.konsistensiAktif = 12;
  else if (daysSinceLogin <= 14) komponen.konsistensiAktif = 8;
  else if (daysSinceLogin <= 30) komponen.konsistensiAktif = 4;
  else {
    komponen.konsistensiAktif = 0;
    rekomendasi.push('Login minimal seminggu sekali untuk menjaga skor konsistensi');
  }

  const wargaAll = await prisma.warga.findMany({
    where: { createdBy: userId, deletedAt: null },
    select: { diverifikasi: true, nikHash: true, noHp: true, tanggalLahir: true },
  });

  if (wargaAll.length > 0) {
    const pctVerified = wargaAll.filter((w) => w.diverifikasi).length / wargaAll.length;
    const pctNik = wargaAll.filter((w) => w.nikHash).length / wargaAll.length;
    const pctHp = wargaAll.filter((w) => w.noHp).length / wargaAll.length;

    let skorValidasi = 0;
    if (pctVerified >= 0.8) skorValidasi += 8;
    else if (pctVerified >= 0.5) skorValidasi += 4;

    if (pctNik >= 0.9) skorValidasi += 7;
    else if (pctNik >= 0.7) skorValidasi += 4;

    if (pctHp >= 0.7) skorValidasi += 5;
    else if (pctHp >= 0.4) skorValidasi += 2;

    komponen.validasiData = Math.min(20, skorValidasi);
  }

  if (wargaAll.length > 0) {
    const pctLengkap = wargaAll.filter((w) => w.nikHash && w.noHp && w.tanggalLahir).length / wargaAll.length;

    if (pctLengkap >= 0.9) komponen.kelengkapanData = 10;
    else if (pctLengkap >= 0.7) komponen.kelengkapanData = 7;
    else if (pctLengkap >= 0.5) komponen.kelengkapanData = 4;
    else komponen.kelengkapanData = 1;
  }

  const accountAgeDays = Math.max(
    1,
    Math.floor((now.getTime() - (user?.createdAt || now).getTime()) / (1000 * 60 * 60 * 24)),
  );
  const ratePerDay = wargaCount / accountAgeDays;

  if (ratePerDay >= 2) komponen.kecepatanInput = 10;
  else if (ratePerDay >= 1) komponen.kecepatanInput = 7;
  else if (ratePerDay >= 0.5) komponen.kecepatanInput = 4;
  else if (ratePerDay >= 0.1) komponen.kecepatanInput = 2;

  let bonus = 0;
  if (wargaCount >= 100) {
    bonus += 5;
    rekomendasi.push('🏆 Bonus: 100+ warga terdaftar!');
  }
  if (laporanCount >= 20) bonus += 3;
  if (komponen.validasiData >= 18) bonus += 2;
  komponen.bonusKhusus = Math.min(10, bonus);

  let penalti = 0;

  if (!user?.lastLoginAt) {
    penalti += 20;
    rekomendasi.push('⚠️ Belum pernah login ke sistem');
  }

  if (daysSinceLogin > 30) {
    penalti += 15;
    rekomendasi.push('⚠️ Tidak aktif lebih dari 30 hari');
  }

  komponen.penalti = -penalti;

  const totalRaw = Object.values(komponen).reduce((s, v) => s + v, 0);
  const skor = Math.max(0, Math.min(100, totalRaw));

  let bintang = 0;
  let level = 'baru';

  if (skor >= 90) {
    bintang = 5;
    level = 'top';
  } else if (skor >= 75) {
    bintang = 4;
    level = 'bintang';
  } else if (skor >= 55) {
    bintang = 3;
    level = 'aktif';
  } else if (skor >= 35) {
    bintang = 2;
    level = 'aktif';
  } else if (skor >= 15) {
    bintang = 1;
    level = 'aktif';
  } else if (daysSinceLogin > 30) {
    bintang = 0;
    level = 'nonaktif';
  } else {
    bintang = 0;
    level = 'baru';
  }

  const dataQualityScore = Math.min(
    100,
    Math.round((komponen.validasiData / 20) * 50 + (komponen.kelengkapanData / 10) * 50),
  );

  return {
    userId,
    skor,
    bintang,
    level,
    komponen,
    rekomendasi,
    totalWargaInput: wargaCount,
    totalLaporanInput: laporanCount,
    dataQualityScore,
  };
}

export const KOORDINATOR_SCORING_ROLES = [
  'koordinator_kecamatan',
  'koordinator_kelurahan',
  'koordinator_rw',
  'koordinator_rt',
  'petugas_lapangan',
] as const;
