import { PrismaClient, UserRole, StatusEkonomi, WarmindoStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { withPrismaPoolParams } from '../src/config/dbUrl';

const rawDb = process.env.DATABASE_URL;
const prisma = new PrismaClient(
  rawDb
    ? {
        datasources: {
          db: {
            url: withPrismaPoolParams(rawDb, {
              connectionLimit: 1,
              poolTimeoutSec: 120,
              suggestPgBouncer: true,
            }),
          },
        },
      }
    : undefined,
);
const SEED_DEFAULT_PASSWORD = 'admin123';

/** Supabase pooler: retry transient disconnects (P1017, etc.). */
async function withDbRetry<T>(label: string, fn: () => Promise<T>, retries = 5): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      last = e;
      const code = e?.code as string | undefined;
      const msg = String(e?.message ?? '');
      const transient =
        code === 'P1017' ||
        code === 'P1001' ||
        code === 'P1014' ||
        msg.includes('Server has closed the connection') ||
        msg.includes('Connection terminated') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT');
      if (!transient || attempt === retries) throw e;
      const delay = 250 * attempt;
      console.warn(`[seed] ${label}: transient ${code ?? msg.slice(0, 40)} — retry ${attempt + 1}/${retries} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw last;
}

type Risk = 'high' | 'medium' | 'low';

type WilayahSeed = {
  kota: { id: number; nama: string };
  kecamatan: { id: number; nama: string };
  kelurahan: { id: number; nama: string; risk: Risk };
  rws: { id: number; nomor: string }[];
  rts: { id: number; nomor: string; rwId: number; risk: Risk; kelurahanId: number; label: string }[];
};

type FamilySeed = {
  id: number;
  noKk: string;
  rtId: number;
  kelurahanId: number;
  namaKepala: string;
  risk: Risk;
  score: number;
  neverAid?: boolean;
  repeatAid?: boolean;
};

const startOfDay = (offsetDays = 0, hour = 9) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
};

const pad = (value: number, length = 3) => String(value).padStart(length, '0');

async function upsertUser(data: {
  email: string;
  nama: string;
  role: UserRole;
  kotaId?: number | null;
  kecamatanId?: number | null;
  kelurahanId?: number | null;
  rwId?: number | null;
  rtId?: number | null;
  warmindoId?: number | null;
}) {
  const passwordHash = await bcrypt.hash(SEED_DEFAULT_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      nama: data.nama,
      role: data.role,
      passwordHash,
      aktif: true,
      kotaId: data.kotaId ?? null,
      kecamatanId: data.kecamatanId ?? null,
      kelurahanId: data.kelurahanId ?? null,
      rwId: data.rwId ?? null,
      rtId: data.rtId ?? null,
      warmindoId: data.warmindoId ?? null,
      loginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      nama: data.nama,
      email: data.email,
      passwordHash,
      role: data.role,
      aktif: true,
      kotaId: data.kotaId ?? null,
      kecamatanId: data.kecamatanId ?? null,
      kelurahanId: data.kelurahanId ?? null,
      rwId: data.rwId ?? null,
      rtId: data.rtId ?? null,
      warmindoId: data.warmindoId ?? null,
    },
  });
}

async function seedWilayah() {
  const mode = (process.env.SEED_MODE ?? 'medium').toLowerCase();
  const rwCap = Math.max(1, Math.min(50, Number(process.env.SEED_RW_CAP ?? (mode === 'small' ? 1 : mode === 'production' ? 3 : 2))));
  const rtCap = Math.max(1, Math.min(80, Number(process.env.SEED_RT_CAP ?? (mode === 'small' ? 2 : mode === 'production' ? 4 : 3))));
  console.log(`[seed] seedWilayah: SEED_MODE=${mode} rwCap=${rwCap} rtCap=${rtCap}`);

  const provinsi = await prisma.provinsi.upsert({
    where: { kode: 'DKI' },
    update: { nama: 'DKI Jakarta' },
    create: { nama: 'DKI Jakarta', kode: 'DKI' },
  });

  const specs = [
    {
      kota: 'Jakarta Barat',
      kodeKota: 'JAKBAR',
      kecamatan: 'Cengkareng',
      kodeKecamatan: 'CGK',
      kelurahan: 'Kapuk',
      kodeKelurahan: 'KPK',
      kodePos: '11720',
      risk: 'high' as Risk,
    },
    {
      kota: 'Jakarta Barat',
      kodeKota: 'JAKBAR',
      kecamatan: 'Tambora',
      kodeKecamatan: 'TBR',
      kelurahan: 'Angke',
      kodeKelurahan: 'ANG',
      kodePos: '11330',
      risk: 'high' as Risk,
    },
    {
      kota: 'Jakarta Selatan',
      kodeKota: 'JAKSEL',
      kecamatan: 'Tebet',
      kodeKecamatan: 'TBT',
      kelurahan: 'Tebet Barat',
      kodeKelurahan: 'TBB',
      kodePos: '12810',
      risk: 'low' as Risk,
    },
    {
      kota: 'Jakarta Pusat',
      kodeKota: 'JAKPUS',
      kecamatan: 'Menteng',
      kodeKecamatan: 'MTG',
      kelurahan: 'Gondangdia',
      kodeKelurahan: 'GND',
      kodePos: '10350',
      risk: 'low' as Risk,
    },
    {
      kota: 'Jakarta Utara',
      kodeKota: 'JAKUT',
      kecamatan: 'Kelapa Gading',
      kodeKecamatan: 'KGD',
      kelurahan: 'Kelapa Gading Timur',
      kodeKelurahan: 'KGT',
      kodePos: '14240',
      risk: 'medium' as Risk,
    },
    {
      kota: 'Jakarta Utara',
      kodeKota: 'JAKUT',
      kecamatan: 'Tanjung Priok',
      kodeKecamatan: 'TPK',
      kelurahan: 'Sunter Jaya',
      kodeKelurahan: 'SNJ',
      kodePos: '14360',
      risk: 'high' as Risk,
    },
    {
      kota: 'Jakarta Selatan',
      kodeKota: 'JAKSEL',
      kecamatan: 'Kebayoran Baru',
      kodeKecamatan: 'KYB',
      kelurahan: 'Melawai',
      kodeKelurahan: 'MLW',
      kodePos: '12160',
      risk: 'low' as Risk,
    },
    {
      kota: 'Jakarta Timur',
      kodeKota: 'JAKTIM',
      kecamatan: 'Matraman',
      kodeKecamatan: 'MTR',
      kelurahan: 'Palmeriam',
      kodeKelurahan: 'PLM',
      kodePos: '13140',
      risk: 'medium' as Risk,
    },
    {
      kota: 'Jakarta Timur',
      kodeKota: 'JAKTIM',
      kecamatan: 'Duren Sawit',
      kodeKecamatan: 'DSW',
      kelurahan: 'Pondok Bambu',
      kodeKelurahan: 'PDB',
      kodePos: '13430',
      risk: 'medium' as Risk,
    },
  ];

  const specsEffective = mode === 'small' ? specs.slice(0, 2) : specs;

  const wilayah: WilayahSeed[] = [];

  for (const spec of specsEffective) {
    const kota = await prisma.kota.upsert({
      where: { kode: spec.kodeKota },
      update: { nama: spec.kota, tipe: 'kota' },
      create: { provinsiId: provinsi.id, nama: spec.kota, kode: spec.kodeKota, tipe: 'kota' },
    });

    const kecamatan = await prisma.kecamatan.upsert({
      where: { kotaId_nama: { kotaId: kota.id, nama: spec.kecamatan } },
      update: { kode: spec.kodeKecamatan },
      create: { kotaId: kota.id, nama: spec.kecamatan, kode: spec.kodeKecamatan },
    });

    const kelurahan = await prisma.kelurahan.upsert({
      where: { kecamatanId_nama: { kecamatanId: kecamatan.id, nama: spec.kelurahan } },
      update: { kode: spec.kodeKelurahan, kodePos: spec.kodePos },
      create: {
        kecamatanId: kecamatan.id,
        nama: spec.kelurahan,
        kode: spec.kodeKelurahan,
        kodePos: spec.kodePos,
      },
    });

    const rws = [];
    const rts = [];
    for (let rwNumber = 1; rwNumber <= rwCap; rwNumber++) {
      const rw = await prisma.rW.upsert({
        where: { kelurahanId_nomor: { kelurahanId: kelurahan.id, nomor: pad(rwNumber) } },
        update: {
          namaKetua: `Ketua RW ${pad(rwNumber)} ${spec.kelurahan}`,
          noHpKetua: `0812${String(kelurahan.id).padStart(4, '0')}${pad(rwNumber, 4)}`,
        },
        create: {
          kelurahanId: kelurahan.id,
          nomor: pad(rwNumber),
          namaKetua: `Ketua RW ${pad(rwNumber)} ${spec.kelurahan}`,
          noHpKetua: `0812${String(kelurahan.id).padStart(4, '0')}${pad(rwNumber, 4)}`,
        },
      });
      rws.push({ id: rw.id, nomor: rw.nomor });

      for (let rtNumber = 1; rtNumber <= rtCap; rtNumber++) {
        const rt = await prisma.rT.upsert({
          where: { rwId_nomor: { rwId: rw.id, nomor: pad(rtNumber) } },
          update: {
            targetWarga: spec.risk === 'low' ? 8 : 12,
            namaKetua: `Ketua RT ${pad(rtNumber)} RW ${pad(rwNumber)} ${spec.kelurahan}`,
          },
          create: {
            rwId: rw.id,
            nomor: pad(rtNumber),
            namaKetua: `Ketua RT ${pad(rtNumber)} RW ${pad(rwNumber)} ${spec.kelurahan}`,
            noHpKetua: `0813${String(kelurahan.id).padStart(4, '0')}${pad(rwNumber * 10 + rtNumber, 4)}`,
            targetWarga: spec.risk === 'low' ? 8 : 12,
          },
        });
        rts.push({
          id: rt.id,
          nomor: rt.nomor,
          rwId: rw.id,
          risk: spec.risk,
          kelurahanId: kelurahan.id,
          label: `${spec.kelurahan} RW ${pad(rwNumber)} RT ${pad(rtNumber)}`,
        });
      }
    }

    wilayah.push({
      kota: { id: kota.id, nama: kota.nama },
      kecamatan: { id: kecamatan.id, nama: kecamatan.nama },
      kelurahan: { id: kelurahan.id, nama: kelurahan.nama, risk: spec.risk },
      rws,
      rts,
    });
  }

  return wilayah;
}

function familyProfile(risk: Risk, index: number) {
  if (risk === 'high') {
    return {
      statusEkonomi: (index % 3 === 0 ? 'sangat_miskin' : 'miskin') as StatusEkonomi,
      statusRumah: index % 2 === 0 ? 'kontrak_padat' : 'semi_permanen',
      income: [600000, 900000, 1200000, 1500000][index % 4],
      score: [96, 91, 87, 82, 78][index % 5],
      anggota: [5, 4, 6, 3, 5][index % 5],
    };
  }
  if (risk === 'medium') {
    return {
      statusEkonomi: (index % 2 === 0 ? 'rentan' : 'sedang') as StatusEkonomi,
      statusRumah: index % 2 === 0 ? 'kontrak' : 'milik_keluarga',
      income: [1800000, 2300000, 3200000, 4100000][index % 4],
      score: [72, 66, 58, 49, 44][index % 5],
      anggota: [4, 3, 5, 4][index % 4],
    };
  }
  return {
    statusEkonomi: (index % 3 === 0 ? 'mampu' : 'sedang') as StatusEkonomi,
    statusRumah: index % 2 === 0 ? 'milik_sendiri' : 'kontrak_layak',
    income: [5200000, 6500000, 7800000, 9000000][index % 4],
    score: [34, 28, 22, 18, 12][index % 5],
    anggota: [3, 4, 2, 4][index % 4],
  };
}

async function seedPopulation(wilayah: WilayahSeed[], createdBy: number) {
  const mode = (process.env.SEED_MODE ?? 'medium').toLowerCase();
  const defaultCap = mode === 'small' ? 80 : mode === 'production' ? 5000 : 320;
  const WARGA_CAP = Math.max(10, Math.min(500_000, Number(process.env.SEED_WARGA_CAP ?? defaultCap)));
  const BATCH = 40;
  const wargaBuffer: Array<Record<string, unknown>> = [];

  const flushWargaBuffer = async () => {
    if (!wargaBuffer.length) return;
    const slice = wargaBuffer.splice(0, wargaBuffer.length);
    const hashes = slice.map((r) => r.nikHash as string);
    const existing = await withDbRetry('warga.findMany(nikHash)', () =>
      prisma.warga.findMany({ where: { nikHash: { in: hashes } }, select: { nikHash: true } }),
    );
    const have = new Set(existing.map((e) => e.nikHash).filter(Boolean) as string[]);
    const data = slice.filter((r) => !have.has(r.nikHash as string)).map((r) => ({ ...r, diverifikasi: true }));
    if (!data.length) return;
    await withDbRetry('warga.createMany', () => prisma.warga.createMany({ data: data as any[] }));
  };

  console.log(`[seed] seedPopulation: start (SEED_MODE=${mode}, warga cap=${WARGA_CAP}, batch=${BATCH})`);

  const firstNames = ['Ahmad', 'Siti', 'Budi', 'Dewi', 'Hendra', 'Rina', 'Joko', 'Nur', 'Agus', 'Fitri', 'Rudi', 'Yanti', 'Doni', 'Maya', 'Rahmat', 'Lina'];
  const lastNames = ['Fauzi', 'Rahayu', 'Santoso', 'Lestari', 'Saputra', 'Wulandari', 'Pratama', 'Hasanah', 'Purnomo', 'Maulana'];
  const families: FamilySeed[] = [];
  let familySeq = 1;
  let wargaSeq = 1;
  let capped = false;

  outer: for (const area of wilayah) {
    for (let rtIndex = 0; rtIndex < area.rts.length; rtIndex++) {
      const rt = area.rts[rtIndex];
      const familyCount = rt.risk === 'high' ? [3, 4, 2, 3, 2, 2][rtIndex] : rt.risk === 'medium' ? [2, 3, 2, 3, 2, 2][rtIndex] : [2, 2, 2, 2, 2, 2][rtIndex];

      for (let i = 0; i < familyCount; i++) {
        const profile = familyProfile(rt.risk, familySeq + i);
        const noKk = `SEED-KK-${pad(familySeq, 5)}`;
        const kepala = `${firstNames[(familySeq + i) % firstNames.length]} ${lastNames[(familySeq + rtIndex) % lastNames.length]}`;
        const repeatAid = rt.risk === 'high' && i === 0;
        const neverAid = rt.risk === 'high' && i === familyCount - 1;

        const keluarga = await withDbRetry(`keluarga.upsert(${noKk})`, () =>
          prisma.keluarga.upsert({
          where: { noKk },
          update: {
            rtId: rt.id,
            namaKepala: kepala,
            noHpKepala: `0817${pad(familySeq, 8)}`,
            jumlahAnggota: profile.anggota,
            jumlahTanggungan: Math.max(1, profile.anggota - 2),
            statusRumah: profile.statusRumah,
            statusEkonomi: profile.statusEkonomi,
            totalPenghasilan: profile.income,
            skorPrioritasBantuan: profile.score,
            kategoriBantuan: profile.score >= 85 ? 'sangat_prioritas' : profile.score >= 65 ? 'prioritas' : profile.score >= 40 ? 'monitoring' : 'mandiri',
            terdaftarProgram: repeatAid ? ['sembako', 'tunai', 'kesehatan'] : neverAid ? [] : profile.score >= 65 ? ['sembako'] : [],
            catatan: `seed=population; wilayah=${rt.label}; povertyRisk=${rt.risk}; housing=${profile.statusRumah}; repeatAid=${repeatAid}; neverAid=${neverAid}`,
          },
          create: {
            rtId: rt.id,
            namaKepala: kepala,
            noKk,
            noHpKepala: `0817${pad(familySeq, 8)}`,
            jumlahAnggota: profile.anggota,
            jumlahTanggungan: Math.max(1, profile.anggota - 2),
            statusRumah: profile.statusRumah,
            statusEkonomi: profile.statusEkonomi,
            totalPenghasilan: profile.income,
            skorPrioritasBantuan: profile.score,
            kategoriBantuan: profile.score >= 85 ? 'sangat_prioritas' : profile.score >= 65 ? 'prioritas' : profile.score >= 40 ? 'monitoring' : 'mandiri',
            terdaftarProgram: repeatAid ? ['sembako', 'tunai', 'kesehatan'] : neverAid ? [] : profile.score >= 65 ? ['sembako'] : [],
            catatan: `seed=population; wilayah=${rt.label}; povertyRisk=${rt.risk}; housing=${profile.statusRumah}; repeatAid=${repeatAid}; neverAid=${neverAid}`,
          },
        }));

        families.push({
          id: keluarga.id,
          noKk,
          rtId: rt.id,
          kelurahanId: rt.kelurahanId,
          namaKepala: keluarga.namaKepala,
          risk: rt.risk,
          score: profile.score,
          neverAid,
          repeatAid,
        });

        for (let member = 0; member < profile.anggota; member++) {
          if (wargaSeq > WARGA_CAP) {
            capped = true;
            break outer;
          }
          const isKepala = member === 0;
          const isPregnant = member === 1 && familySeq % 7 === 0;
          const isElderly = member === profile.anggota - 1 && familySeq % 5 === 0;
          const isChild = member >= 2 && member % 2 === 0;
          const hasDisability = rt.risk === 'high' && member === 2 && familySeq % 4 === 0;
          const unemployed = rt.risk === 'high' && isKepala && familySeq % 3 === 0;
          const education = isChild ? ['SD', 'SMP', 'SMA'][member % 3] : profile.income > 5000000 ? 'Diploma/S1' : ['SD', 'SMP', 'SMA'][familySeq % 3];
          const bpjs = profile.score >= 75 ? 'PBI' : profile.score >= 45 ? 'Mandiri kelas 3' : 'Mandiri';
          const health = hasDisability ? 'disabilitas_mobilitas' : isPregnant ? 'hamil_risiko' : isElderly ? 'lansia_hipertensi' : rt.risk === 'high' ? 'ISPA_musiman' : 'normal';
          const pekerjaan = isChild
            ? 'Pelajar'
            : isPregnant
              ? 'IRT'
              : unemployed
                ? 'Menganggur'
                : ['Pedagang kecil', 'Buruh harian', 'Ojek online', 'Karyawan toko', 'Wiraswasta', 'Guru honorer'][wargaSeq % 6];
          const kategori = hasDisability
            ? 'penyandang_disabilitas'
            : isElderly
              ? 'lansia'
              : isPregnant
                ? 'ibu_hamil'
                : isChild
                  ? 'anak'
                  : repeatAid
                    ? 'penerima_bantuan'
                    : 'warga_biasa';

          wargaBuffer.push({
            nikHash: `seed-nik-${pad(wargaSeq, 6)}`,
            rtId: rt.id,
            kkId: keluarga.id,
            nama: isKepala ? kepala : `${firstNames[(wargaSeq + member) % firstNames.length]} ${lastNames[(familySeq + member) % lastNames.length]}`,
            noHp: isKepala ? `0818${pad(wargaSeq, 8)}` : undefined,
            jenisKelamin: member % 2 === 0 ? 'L' : 'P',
            tanggalLahir: isChild
              ? new Date(2014 + (member % 8), member % 12, 12)
              : isElderly
                ? new Date(1948 + (familySeq % 8), member % 12, 10)
                : new Date(1980 + (wargaSeq % 24), member % 12, 15),
            pekerjaan,
            penghasilanEst: isKepala ? profile.income : isChild ? 0 : Math.round(profile.income * 0.35),
            statusEkonomi: profile.statusEkonomi,
            kemampuanKerja: !isChild && !isElderly && !hasDisability && !isPregnant,
            kebutuhanKhusus: hasDisability ? 'disabilitas_mobilitas' : isPregnant ? 'ibu_hamil' : isElderly ? 'lansia' : isChild ? 'anak_sekolah' : null,
            kategori,
            alamat: `${rt.label}, Jakarta`,
            catatan: `seed=population; pendidikan=${education}; bpjs=${bpjs}; kesehatan=${health}; povertyRisk=${rt.risk}; unemployment=${unemployed}; housing=${profile.statusRumah}; aidPriorityScore=${profile.score}`,
            createdBy,
          });
          if (wargaBuffer.length >= BATCH) {
            await flushWargaBuffer();
            console.log(`[seed] seedPopulation: flushed warga batch (progress wargaSeq=${wargaSeq})`);
          }
          wargaSeq++;
          if (wargaSeq % 500 === 0 || wargaSeq === 2) {
            console.log(`[seed] seedPopulation: warga progress ${wargaSeq - 1}/${WARGA_CAP} (families=${families.length})`);
            await new Promise((r) => setTimeout(r, 25));
          }
        }
        familySeq++;
      }
    }
  }

  if (capped) console.log(`[seed] seedPopulation: stopped at warga cap ${WARGA_CAP}`);
  await flushWargaBuffer();
  console.log(`[seed] seedPopulation: done (families=${families.length}, wargaSeq=${wargaSeq - 1})`);
  return families;
}

async function seedUmkm(families: FamilySeed[], createdBy: number) {
  const selected = families.filter((family, index) => index % 6 === 0 || family.risk === 'low').slice(0, 18);
  const categories = ['kuliner', 'warung', 'jahit', 'laundry', 'jasa', 'kerajinan'];

  for (let i = 0; i < selected.length; i++) {
    const family = selected[i];
    const kodeUmkm = `UMKM-SEED-${pad(i + 1, 3)}`;
    await prisma.umkm.upsert({
      where: { kodeUmkm },
      update: {
        rtId: family.rtId,
        kelurahanId: family.kelurahanId,
        status: family.risk === 'high' ? 'rintisan' : 'aktif',
        omzetBulananEst: family.risk === 'high' ? 2500000 + i * 150000 : 8500000 + i * 300000,
        jumlahKaryawan: family.risk === 'low' ? 3 : 1,
        aktif: true,
      },
      create: {
        kodeUmkm,
        namaUsaha: `${categories[i % categories.length]} ${family.namaKepala.split(' ')[0]} Mandiri`,
        pemilikNama: family.namaKepala,
        rtId: family.rtId,
        kelurahanId: family.kelurahanId,
        kategori: categories[i % categories.length],
        produkUtama: ['nasi uduk', 'sembako harian', 'jahit seragam', 'cuci kiloan', 'servis kecil', 'souvenir lokal'][i % 6],
        status: family.risk === 'high' ? 'rintisan' : 'aktif',
        omzetBulananEst: family.risk === 'high' ? 2500000 + i * 150000 : 8500000 + i * 300000,
        jumlahKaryawan: family.risk === 'low' ? 3 : 1,
        noHp: `0821${pad(i + 1, 8)}`,
        alamat: `RT seed ${family.rtId}`,
        catatan: `seed=umkm; povertyRisk=${family.risk}; ownership=keluarga`,
        createdBy,
      },
    });
  }
}

async function upsertWarmindoTransaction(warmindoId: number, tanggal: Date, data: any) {
  const existing = await prisma.warmindoTransaksi.findFirst({ where: { warmindoId, tanggal } });
  if (existing) return prisma.warmindoTransaksi.update({ where: { id: existing.id }, data });
  return prisma.warmindoTransaksi.create({ data: { warmindoId, tanggal, ...data } });
}

async function upsertWarmindoExpense(warmindoId: number, tanggal: Date, kategori: string, deskripsi: string, jumlah: number) {
  const existing = await prisma.warmindoPengeluaran.findFirst({ where: { warmindoId, tanggal, kategori, deskripsi } });
  if (existing) return prisma.warmindoPengeluaran.update({ where: { id: existing.id }, data: { jumlah } });
  return prisma.warmindoPengeluaran.create({ data: { warmindoId, tanggal, kategori, deskripsi, jumlah } });
}

async function seedWarmindo(wilayah: WilayahSeed[]) {
  const outlets: { id: number; kodeOutlet: string; namaOutlet: string }[] = [];
  const areaByKel = new Map(wilayah.map((w) => [w.kelurahan.nama, w]));
  const ar = (nama: string) => areaByKel.get(nama) ?? wilayah[0];
  const outletSpecs = [
    { kode: 'WRM-KPK-001', nama: 'Warmindo Kapuk Produktif', area: ar('Kapuk'), status: 'aktif' as WarmindoStatus, anomaly: 'low_stock' },
    { kode: 'WRM-ANG-001', nama: 'Warmindo Angke Tangguh', area: ar('Angke'), status: 'aktif' as WarmindoStatus, anomaly: 'high_expense' },
    { kode: 'WRM-TBB-001', nama: 'Warmindo Tebet Barat Sehat', area: ar('Tebet Barat'), status: 'aktif' as WarmindoStatus, anomaly: 'normal' },
    { kode: 'WRM-PDB-001', nama: 'Warmindo Pondok Bambu Ramai', area: ar('Pondok Bambu'), status: 'aktif' as WarmindoStatus, anomaly: 'overload' },
    { kode: 'WRM-KPK-002', nama: 'Warmindo Kapuk Persiapan', area: ar('Kapuk'), status: 'persiapan' as WarmindoStatus, anomaly: 'opening' },
  ];

  for (let i = 0; i < outletSpecs.length; i++) {
    const spec = outletSpecs[i];
    const rt = spec.area.rts[i % spec.area.rts.length];
    const outlet = await prisma.warmindoOutlet.upsert({
      where: { kodeOutlet: spec.kode },
      update: {
        namaOutlet: spec.nama,
        kelurahanId: spec.area.kelurahan.id,
        rtId: rt.id,
        status: spec.status,
        aktif: spec.status !== 'tutup',
        targetOmzetHarian: spec.anomaly === 'overload' ? 1400000 : 1000000,
        targetLabaBulanan: 3200000,
      },
      create: {
        kodeOutlet: spec.kode,
        namaOutlet: spec.nama,
        kelurahanId: spec.area.kelurahan.id,
        rtId: rt.id,
        alamat: `${rt.label}, Jakarta`,
        status: spec.status,
        modalAwal: 18000000 + i * 2500000,
        targetOmzetHarian: spec.anomaly === 'overload' ? 1400000 : 1000000,
        targetLabaBulanan: 3200000,
        biayaSewaBulanan: spec.anomaly === 'high_expense' ? 2600000 : 1500000,
        karyawanTotal: spec.anomaly === 'overload' ? 6 : 3,
        aktif: spec.status !== 'tutup',
        tanggalBuka: startOfDay(-120 + i * 8),
      },
    });
    outlets.push({ id: outlet.id, kodeOutlet: outlet.kodeOutlet, namaOutlet: outlet.namaOutlet });

    const inventory = [
      { namaBahan: 'Mie Instan Karton', satuan: 'karton', stokSaatIni: spec.anomaly === 'low_stock' ? 2 : 22, stokMinimum: 5, hargaBeli: 96000, hargaJual: 3500 },
      { namaBahan: 'Telur Ayam', satuan: 'kg', stokSaatIni: spec.anomaly === 'low_stock' ? 1 : 14, stokMinimum: 3, hargaBeli: 28000, hargaJual: 3000 },
      { namaBahan: 'Beras', satuan: 'kg', stokSaatIni: 35, stokMinimum: 10, hargaBeli: 13500, hargaJual: 0 },
      { namaBahan: 'Minuman Sachet', satuan: 'pak', stokSaatIni: spec.anomaly === 'overload' ? 4 : 20, stokMinimum: 6, hargaBeli: 45000, hargaJual: 5000 },
      { namaBahan: 'Gas LPG 3kg', satuan: 'tabung', stokSaatIni: spec.anomaly === 'overload' ? 1 : 5, stokMinimum: 2, hargaBeli: 21000, hargaJual: 0 },
    ];

    for (const item of inventory) {
      await prisma.warmindoInventory.upsert({
        where: { warmindoId_namaBahan: { warmindoId: outlet.id, namaBahan: item.namaBahan } },
        update: item,
        create: { warmindoId: outlet.id, ...item },
      });
    }

    for (let day = -6; day <= 0; day++) {
      const tanggal = startOfDay(day, 8 + i);
      const baseOmzet = spec.anomaly === 'overload' ? 1700000 : spec.anomaly === 'high_expense' ? 850000 : 950000;
      const drop = spec.anomaly === 'high_expense' && day >= -1 ? 0.65 : 1;
      const totalOmzet = Math.round((baseOmzet + (day + 6) * 45000 + i * 25000) * drop);
      const totalHpp = Math.round(totalOmzet * (spec.anomaly === 'high_expense' ? 0.78 : 0.64));
      await upsertWarmindoTransaction(outlet.id, tanggal, {
        totalOmzet,
        totalHpp,
        grossProfit: totalOmzet - totalHpp,
        jumlahItem: Math.round(totalOmzet / 15000),
        metodeBayar: day % 2 === 0 ? 'qris' : 'tunai',
        items: [
          { nama: 'Mie goreng telur', qty: Math.round(totalOmzet / 45000), harga: 15000 },
          { nama: 'Es teh manis', qty: Math.round(totalOmzet / 70000), harga: 5000 },
          { nama: 'Nasi telur', qty: Math.round(totalOmzet / 90000), harga: 12000 },
        ],
        catatan: `seed=warmindo; anomaly=${spec.anomaly}; daily_cashflow=true`,
      });
    }

    await upsertWarmindoExpense(outlet.id, startOfDay(-2, 14), 'bahan_baku', 'Procurement supplier pasar lokal', spec.anomaly === 'overload' ? 1800000 : 950000);
    await upsertWarmindoExpense(outlet.id, startOfDay(-1, 15), 'gaji_karyawan', 'Shift dan kasir mingguan', spec.anomaly === 'overload' ? 1750000 : 900000);
    await upsertWarmindoExpense(outlet.id, startOfDay(0, 16), 'lain', spec.anomaly === 'high_expense' ? 'Perbaikan freezer mendadak' : 'Operasional harian', spec.anomaly === 'high_expense' ? 2400000 : 250000);
  }

  return outlets;
}

async function upsertByUnique(modelName: string, uniqueField: string, data: any) {
  const model = (prisma as any)[modelName];
  return model.upsert({
    where: { [uniqueField]: data[uniqueField] },
    update: data,
    create: data,
  });
}

async function seedWarmindoFieldOps(outlets: { id: number; kodeOutlet: string; namaOutlet: string }[]) {
  const supplierSpecs = [
    { kodeSupplier: 'SUP-SEED-001', nama: 'Pasar Induk Beras Cipinang', kategori: 'sembako', noHp: '081900000001', alamat: 'Cipinang', rating: 4.6, aktif: true },
    { kodeSupplier: 'SUP-SEED-002', nama: 'Agen Telur Jaya', kategori: 'protein', noHp: '081900000002', alamat: 'Cengkareng', rating: 4.2, aktif: true },
    { kodeSupplier: 'SUP-SEED-003', nama: 'Distributor Mie Nusantara', kategori: 'mie', noHp: '081900000003', alamat: 'Tambora', rating: 4.4, aktif: true },
    { kodeSupplier: 'SUP-SEED-004', nama: 'Toko Plastik dan Kemasan Amanah', kategori: 'kemasan', noHp: '081900000004', alamat: 'Tebet', rating: 3.8, aktif: true },
  ];
  const suppliers = [];
  for (const supplier of supplierSpecs) {
    suppliers.push(await upsertByUnique('warmindoSupplier', 'kodeSupplier', supplier));
  }

  const productBase = [
    ['MIE-GORENG-TELUR', 'Mie Goreng Telur', 'makanan', 15000, 9800],
    ['MIE-REBUS-SAYUR', 'Mie Rebus Sayur', 'makanan', 14000, 9200],
    ['NASI-TELUR', 'Nasi Telur Sambal', 'makanan', 12000, 7600],
    ['KOPI-HITAM', 'Kopi Hitam', 'minuman', 5000, 1800],
    ['ES-TEH', 'Es Teh Manis', 'minuman', 5000, 1500],
    ['ROTI-BAKAR', 'Roti Bakar Coklat', 'snack', 11000, 6200],
  ] as const;

  for (let outletIndex = 0; outletIndex < outlets.length; outletIndex++) {
    const outlet = outlets[outletIndex];
    const products = [];
    for (const [sku, nama, kategori, hargaJual, hpp] of productBase) {
      products.push(await upsertByUnique('warmindoProduct', 'kodeProduct', {
        kodeProduct: `${outlet.kodeOutlet}-${sku}`,
        warmindoId: outlet.id,
        nama,
        kategori,
        hargaJual,
        hpp,
        aktif: true,
        isBestSeller: sku === 'MIE-GORENG-TELUR' || sku === 'ES-TEH',
      }));
    }

    const procurement = await upsertByUnique('warmindoProcurement', 'kodeProcurement', {
      kodeProcurement: `PROC-${outlet.kodeOutlet}-001`,
      warmindoId: outlet.id,
      supplierId: suppliers[outletIndex % suppliers.length].id,
      tanggal: startOfDay(-6, 8),
      status: 'received',
      totalAmount: outletIndex === 3 ? 4200000 : 2600000,
      paymentStatus: outletIndex === 1 ? 'partial' : 'paid',
      catatan: `seed=procurement; outlet=${outlet.kodeOutlet}`,
    });

    for (const item of [
      ['Mie Instan Karton', 12, 'karton', 96000],
      ['Telur Ayam', 20, 'kg', 28000],
      ['Beras', 40, 'kg', 13500],
      ['Minuman Sachet', 12, 'pak', 45000],
    ] as const) {
      const [inventoryName, qty, satuan, unitCost] = item;
      const existingItem = await (prisma as any).warmindoProcurementItem.findFirst({
        where: { procurementId: procurement.id, inventoryName },
      });
      const itemData = { procurementId: procurement.id, inventoryName, qty, satuan, unitCost, totalCost: qty * unitCost };
      if (existingItem) await (prisma as any).warmindoProcurementItem.update({ where: { id: existingItem.id }, data: itemData });
      else await (prisma as any).warmindoProcurementItem.create({ data: itemData });
    }

    const transactions = await prisma.warmindoTransaksi.findMany({
      where: { warmindoId: outlet.id, tanggal: { gte: startOfDay(-6, 0) } },
      orderBy: { tanggal: 'asc' },
    });
    for (let txIndex = 0; txIndex < transactions.length; txIndex++) {
      const trx = transactions[txIndex];
      const qtyBase = Math.max(1, Math.round(trx.jumlahItem / products.length));
      for (let pIndex = 0; pIndex < products.length; pIndex++) {
        const product = products[pIndex];
        const qty = qtyBase + ((txIndex + pIndex) % 3);
        const existingLine = await (prisma as any).warmindoSaleLineItem.findFirst({
          where: { transaksiId: trx.id, productName: product.nama },
        });
        const lineData = {
          transaksiId: trx.id,
          warmindoId: outlet.id,
          productId: product.id,
          productName: product.nama,
          qty,
          unitPrice: product.hargaJual,
          unitHpp: product.hpp,
          total: qty * product.hargaJual,
          grossProfit: qty * (product.hargaJual - product.hpp),
        };
        if (existingLine) await (prisma as any).warmindoSaleLineItem.update({ where: { id: existingLine.id }, data: lineData });
        else await (prisma as any).warmindoSaleLineItem.create({ data: lineData });
      }

      const existingCashIn = await (prisma as any).warmindoCashflowLedger.findFirst({
        where: { warmindoId: outlet.id, referenceType: 'warmindo_transaksi', referenceId: trx.id },
      });
      const cashInData = {
        warmindoId: outlet.id,
        tanggal: trx.tanggal,
        direction: 'in',
        kategori: 'sales',
        amount: trx.totalOmzet,
        description: `Penjualan harian ${outlet.namaOutlet}`,
        referenceType: 'warmindo_transaksi',
        referenceId: trx.id,
      };
      if (existingCashIn) await (prisma as any).warmindoCashflowLedger.update({ where: { id: existingCashIn.id }, data: cashInData });
      else await (prisma as any).warmindoCashflowLedger.create({ data: cashInData });
    }

    const expenses = await prisma.warmindoPengeluaran.findMany({ where: { warmindoId: outlet.id } });
    for (const expense of expenses) {
      const existingCashOut = await (prisma as any).warmindoCashflowLedger.findFirst({
        where: { warmindoId: outlet.id, referenceType: 'warmindo_pengeluaran', referenceId: expense.id },
      });
      const cashOutData = {
        warmindoId: outlet.id,
        tanggal: expense.tanggal,
        direction: 'out',
        kategori: expense.kategori,
        amount: expense.jumlah,
        description: expense.deskripsi,
        referenceType: 'warmindo_pengeluaran',
        referenceId: expense.id,
      };
      if (existingCashOut) await (prisma as any).warmindoCashflowLedger.update({ where: { id: existingCashOut.id }, data: cashOutData });
      else await (prisma as any).warmindoCashflowLedger.create({ data: cashOutData });
    }

    for (const movement of [
      ['Mie Instan Karton', 'in', 12, 'karton', 'procurement'],
      ['Telur Ayam', 'in', 20, 'kg', 'procurement'],
      ['Mie Instan Karton', 'out', outletIndex === 0 ? 10 : 4, 'karton', 'sales_usage'],
      ['Gas LPG 3kg', 'out', outletIndex === 3 ? 4 : 1, 'tabung', 'sales_usage'],
    ] as const) {
      const [namaBahan, movementType, qty, satuan, reason] = movement;
      const movementDate = startOfDay(-5 + outletIndex, 10);
      const existingMovement = await (prisma as any).warmindoStockMovement.findFirst({
        where: { warmindoId: outlet.id, namaBahan, movementType, tanggal: movementDate },
      });
      const movementData = { warmindoId: outlet.id, namaBahan, movementType, qty, satuan, reason, referenceType: 'seed', referenceId: procurement.id, tanggal: movementDate };
      if (existingMovement) await (prisma as any).warmindoStockMovement.update({ where: { id: existingMovement.id }, data: movementData });
      else await (prisma as any).warmindoStockMovement.create({ data: movementData });
    }

    for (let day = -6; day <= 0; day++) {
      const tanggal = startOfDay(day, 0);
      const dayStart = startOfDay(day, 0);
      const nextDay = startOfDay(day + 1, 0);
      const sales = await prisma.warmindoTransaksi.aggregate({
        where: { warmindoId: outlet.id, tanggal: { gte: dayStart, lt: nextDay } },
        _sum: { totalOmzet: true, grossProfit: true },
      });
      const expenseAgg = await prisma.warmindoPengeluaran.aggregate({
        where: { warmindoId: outlet.id, tanggal: { gte: dayStart, lt: nextDay } },
        _sum: { jumlah: true },
      });
      const totalSales = sales._sum.totalOmzet ?? 0;
      const totalExpenses = expenseAgg._sum.jumlah ?? 0;
      const variance = outletIndex === 1 && day === 0 ? -75000 : outletIndex === 3 && day === -1 ? -125000 : 0;
      await upsertByUnique('warmindoDailyClosing', 'kodeClosing', {
        kodeClosing: `CLOSE-${outlet.kodeOutlet}-${tanggal.toISOString().slice(0, 10)}`,
        warmindoId: outlet.id,
        tanggal,
        totalSales,
        totalExpenses,
        cashExpected: totalSales - totalExpenses,
        cashActual: totalSales - totalExpenses + variance,
        variance,
        status: variance === 0 ? 'closed' : 'variance',
        closedBy: null,
        notes: variance === 0 ? 'Seed daily closing normal' : 'Seed daily closing variance perlu audit kasir',
      });
    }

    const employeeNames = ['Aldi Saputra', 'Mira Lestari', 'Tono Wijaya'];
    const employees = [];
    for (let eIndex = 0; eIndex < employeeNames.length; eIndex++) {
      employees.push(await upsertByUnique('warmindoEmployee', 'kodeEmployee', {
        kodeEmployee: `EMP-${outlet.kodeOutlet}-${pad(eIndex + 1, 2)}`,
        warmindoId: outlet.id,
        nama: `${employeeNames[eIndex]} ${outletIndex + 1}`,
        role: eIndex === 0 ? 'manager_shift' : eIndex === 1 ? 'kasir' : 'cook',
        noHp: `0855${pad(outletIndex * 10 + eIndex + 1, 8)}`,
        gajiPokok: eIndex === 0 ? 3200000 : 2600000,
        aktif: true,
        joinedAt: startOfDay(-150 + eIndex, 9),
      }));
    }

    for (let day = -6; day <= 0; day++) {
      for (let eIndex = 0; eIndex < employees.length; eIndex++) {
        const employee = employees[eIndex];
        const tanggal = startOfDay(day, 0);
        const isProblem = (outletIndex === 3 && eIndex === 1 && day === -1) || (outletIndex === 1 && eIndex === 2 && day === 0);
        const shift = await upsertByUnique('warmindoShift', 'kodeShift', {
          kodeShift: `SHIFT-${outlet.kodeOutlet}-${employee.id}-${tanggal.toISOString().slice(0, 10)}`,
          warmindoId: outlet.id,
          employeeId: employee.id,
          tanggal,
          shiftName: eIndex === 0 ? 'pagi' : 'siang',
          startTime: startOfDay(day, eIndex === 0 ? 7 : 13),
          endTime: startOfDay(day, eIndex === 0 ? 13 : 21),
          status: isProblem ? 'missed' : 'completed',
        });
        await upsertByUnique('warmindoAttendance', 'kodeAttendance', {
          kodeAttendance: `ATT-${outlet.kodeOutlet}-${employee.id}-${tanggal.toISOString().slice(0, 10)}`,
          warmindoId: outlet.id,
          employeeId: employee.id,
          shiftId: shift.id,
          tanggal,
          checkIn: isProblem ? null : startOfDay(day, eIndex === 0 ? 7 : 13),
          checkOut: isProblem ? null : startOfDay(day, eIndex === 0 ? 13 : 21),
          status: isProblem ? (outletIndex === 3 ? 'absent' : 'late') : 'present',
          lateMinutes: isProblem && outletIndex === 1 ? 95 : 0,
          notes: isProblem ? 'Seed attendance issue untuk validasi field readiness' : 'Seed attendance normal',
        });
      }
    }

    for (const employee of employees) {
      await upsertByUnique('warmindoPayroll', 'kodePayroll', {
        kodePayroll: `PAY-${outlet.kodeOutlet}-${employee.id}-2026-05`,
        warmindoId: outlet.id,
        employeeId: employee.id,
        periode: '2026-05',
        baseSalary: employee.gajiPokok,
        bonus: outletIndex === 2 ? 150000 : 0,
        deduction: outletIndex === 3 ? 75000 : 0,
        netSalary: employee.gajiPokok + (outletIndex === 2 ? 150000 : 0) - (outletIndex === 3 ? 75000 : 0),
        status: outletIndex === 1 ? 'pending' : 'paid',
        paidAt: outletIndex === 1 ? null : startOfDay(-2, 17),
      });
    }

    const assets = [];
    for (const asset of [
      ['KOMPOR', 'Kompor dua tungku', 'dapur', outletIndex === 1 ? 'rusak_ringan' : 'baik', 1200000],
      ['FREEZER', 'Freezer minuman', 'pendingin', outletIndex === 1 ? 'rusak' : 'baik', 3500000],
      ['MEJA', 'Meja pelanggan', 'fasilitas', outletIndex === 3 ? 'butuh_perbaikan' : 'baik', 900000],
    ] as const) {
      const [code, namaAsset, kategori, kondisi, nilaiBeli] = asset;
      assets.push(await upsertByUnique('warmindoAsset', 'kodeAsset', {
        kodeAsset: `AST-${outlet.kodeOutlet}-${code}`,
        warmindoId: outlet.id,
        namaAsset,
        kategori,
        kondisi,
        nilaiBeli,
        tanggalBeli: startOfDay(-120, 0),
        aktif: true,
      }));
    }

    if (outletIndex === 1 || outletIndex === 3) {
      const asset = assets[outletIndex === 1 ? 1 : 2];
      await upsertByUnique('warmindoMaintenance', 'kodeMaintenance', {
        kodeMaintenance: `MNT-${outlet.kodeOutlet}-001`,
        warmindoId: outlet.id,
        assetId: asset.id,
        tanggal: startOfDay(0, 12),
        issue: outletIndex === 1 ? 'Freezer tidak stabil, biaya listrik naik dan produk minuman rusak' : 'Meja dan area duduk overload saat jam makan',
        severity: outletIndex === 1 ? 'high' : 'medium',
        status: 'open',
        cost: outletIndex === 1 ? 2400000 : 450000,
        resolvedAt: null,
        notes: 'Seed maintenance case for operational dashboard',
      });
    }
  }
}

async function seedRoleUsers(wilayah: WilayahSeed[], outlets: { id: number }[]) {
  const jakartaBarat =
    wilayah.find((w) => w.kelurahan.nama === 'Kapuk' && w.kecamatan.nama === 'Cengkareng') ?? wilayah[0];
  await upsertUser({ email: 'admin.kota@jakdata.id', nama: 'Admin Kota Jakarta Barat', role: 'admin_kota', kotaId: jakartaBarat.kota.id });
  await upsertUser({ email: 'admin.kecamatan@jakdata.id', nama: 'Admin Kecamatan Cengkareng', role: 'admin_kecamatan', kecamatanId: jakartaBarat.kecamatan.id });
  await upsertUser({ email: 'admin.kelurahan@jakdata.id', nama: 'Admin Kelurahan Kapuk', role: 'admin_kelurahan', kelurahanId: jakartaBarat.kelurahan.id });
  await upsertUser({ email: 'koordinator.kecamatan@jakdata.id', nama: 'Koordinator Kecamatan Cengkareng', role: 'koordinator_kecamatan', kecamatanId: jakartaBarat.kecamatan.id });
  await upsertUser({ email: 'koordinator.kelurahan@jakdata.id', nama: 'Koordinator Kelurahan Kapuk', role: 'koordinator_kelurahan', kelurahanId: jakartaBarat.kelurahan.id });
  await upsertUser({ email: 'koordinator.rw@jakdata.id', nama: 'Koordinator RW Kapuk', role: 'koordinator_rw', rwId: jakartaBarat.rws[0].id, kelurahanId: jakartaBarat.kelurahan.id, kecamatanId: jakartaBarat.kecamatan.id });
  await upsertUser({
    email: 'koordinator.rt@jakdata.id',
    nama: 'Koordinator RT Kapuk',
    role: 'koordinator_rt',
    rtId: jakartaBarat.rts[0].id,
    rwId: jakartaBarat.rws[0].id,
    kelurahanId: jakartaBarat.kelurahan.id,
    kecamatanId: jakartaBarat.kecamatan.id,
  });
  await upsertUser({
    email: 'petugas@jakdata.id',
    nama: 'Petugas Lapangan Kapuk',
    role: 'petugas_lapangan',
    rtId: jakartaBarat.rts[0].id,
    rwId: jakartaBarat.rws[0].id,
    kelurahanId: jakartaBarat.kelurahan.id,
    kecamatanId: jakartaBarat.kecamatan.id,
  });
  await upsertUser({ email: 'auditor@jakdata.id', nama: 'Auditor JAKDATA', role: 'auditor' });
  await upsertUser({ email: 'finance@jakdata.id', nama: 'Finance Admin JAKDATA', role: 'finance_admin' });
  const warmindoOp = await upsertUser({
    email: 'warmindo@jakdata.id',
    nama: 'Operator Warmindo Kapuk',
    role: 'manager_warmindo',
    kelurahanId: jakartaBarat.kelurahan.id,
    warmindoId: outlets[0].id,
  });
  await upsertUser({ email: 'kasir.warmindo@jakdata.id', nama: 'Kasir Warmindo Kapuk', role: 'kasir_warmindo', warmindoId: outlets[0].id });

  await prisma.warmindoOutlet.update({ where: { id: outlets[0].id }, data: { managerUserId: warmindoOp.id } });
}

async function upsertBantuanByName(data: any) {
  const existing = await prisma.bantuan.findFirst({ where: { nama: data.nama } });
  if (existing) return prisma.bantuan.update({ where: { id: existing.id }, data });
  return prisma.bantuan.create({ data });
}

async function upsertAidRecipient(data: {
  bantuanId: number;
  keluargaId: number;
  namaPenerima: string;
  rtId: number;
  jumlahDiterima: number;
  status: 'terjadwal' | 'diterima' | 'tidak_hadir' | 'ditolak';
  tanggalDiterima?: Date | null;
  catatan: string;
}) {
  const existing = await prisma.bantuanPenerima.findFirst({ where: { catatan: data.catatan } });
  if (existing) return prisma.bantuanPenerima.update({ where: { id: existing.id }, data });
  return prisma.bantuanPenerima.create({ data });
}

async function seedAidAndFairness(families: FamilySeed[], createdBy: number) {
  const programDefs = [
    { nama: 'Sembako Prioritas 2026', tipe: 'sembako', deskripsi: 'Beras, minyak, gula, protein', satuan: 'paket', nilaiPerSatuan: 180000, stokTotal: 240, stokTersisa: 161, sumber: 'APBD Sosial', tanggalMasuk: startOfDay(-25), aktif: true },
    { nama: 'Bantuan Tunai Rentan', tipe: 'uang_tunai', deskripsi: 'Tunai keluarga rentan', satuan: 'orang', nilaiPerSatuan: 500000, stokTotal: 80, stokTersisa: 44, sumber: 'Dana Sosial', tanggalMasuk: startOfDay(-20), aktif: true },
    { nama: 'Dukungan Ibu Hamil dan Balita', tipe: 'kesehatan', deskripsi: 'Nutrisi, vitamin, rujukan puskesmas', satuan: 'paket', nilaiPerSatuan: 260000, stokTotal: 60, stokTersisa: 39, sumber: 'Program Kesehatan', tanggalMasuk: startOfDay(-18), aktif: true },
    { nama: 'Modal Mikro UMKM Warga', tipe: 'modal', deskripsi: 'Dukungan alat dan bahan usaha mikro', satuan: 'paket', nilaiPerSatuan: 1000000, stokTotal: 25, stokTersisa: 12, sumber: 'Ekonomi Produktif', tanggalMasuk: startOfDay(-14), aktif: true },
  ];
  const programs = [];
  for (const def of programDefs) {
    programs.push(await upsertBantuanByName(def));
  }

  const repeated = families.filter((family) => family.repeatAid).slice(0, 4);
  const regular = families.filter((family) => family.score >= 65 && !family.neverAid).slice(0, 24);

  let record = 1;
  for (const family of regular) {
    await upsertAidRecipient({
      bantuanId: programs[record % programs.length].id,
      keluargaId: family.id,
      namaPenerima: family.namaKepala,
      rtId: family.rtId,
      jumlahDiterima: 1,
      status: record % 5 === 0 ? 'terjadwal' : 'diterima',
      tanggalDiterima: record % 5 === 0 ? null : startOfDay(-record, 10),
      catatan: `seed=aiaid-${pad(record, 3)}; fairness=regular; noKk=${family.noKk}`,
    });
    record++;
  }

  for (const family of repeated) {
    for (let repeat = 0; repeat < 3; repeat++) {
      await upsertAidRecipient({
        bantuanId: programs[repeat].id,
        keluargaId: family.id,
        namaPenerima: family.namaKepala,
        rtId: family.rtId,
        jumlahDiterima: 1,
        status: 'diterima',
        tanggalDiterima: startOfDay(-30 + repeat * 9, 11),
        catatan: `seed=aiaid-repeat-${family.noKk}-${repeat}; fairness=repeated_recipient`,
      });
    }
  }

  const neverReached = families.filter((family) => family.neverAid && family.score >= 80).slice(0, 5);
  for (const family of neverReached) {
    await prisma.operationalAlert.upsert({
      where: { kodeAlert: `FAIR-${family.noKk}` },
      update: { status: 'open', severity: 'critical', wilayahLevel: 'rt', wilayahId: family.rtId },
      create: {
        kodeAlert: `FAIR-${family.noKk}`,
        kategori: 'aid_fairness',
        severity: 'critical',
        status: 'open',
        judul: 'Keluarga risiko tinggi belum menerima bantuan',
        deskripsi: `${family.namaKepala} memiliki skor prioritas ${family.score} namun belum masuk riwayat penerima.`,
        source: 'seed',
        entityType: 'keluarga',
        entityId: family.id,
        wilayahLevel: 'rt',
        wilayahId: family.rtId,
        metadata: { noKk: family.noKk, score: family.score, anomaly: 'unreached_high_risk' },
        createdBy,
      },
    });
  }

  const repeatedCount = repeated.length;
  const uncoveredCount = neverReached.length;
  const totalHighRisk = families.filter((family) => family.score >= 80).length;
  const totalRecipients = await prisma.bantuanPenerima.count();
  const rawFairnessScore = Math.round(100 - repeatedCount * 7 - uncoveredCount * 5 - Math.max(0, totalHighRisk - regular.length) * 0.35);
  const fairnessScore = Math.max(42, Math.min(100, rawFairnessScore));

  await upsertByUnique('bantuanFairnessSnapshot', 'kodeSnapshot', {
    kodeSnapshot: 'FAIR-SNAPSHOT-DKI-2026-05',
    wilayahLevel: 'provinsi',
    wilayahId: null,
    fairnessScore,
    repeatedRecipients: repeatedCount,
    uncoveredHighRisk: uncoveredCount,
    totalRecipients,
    totalHighRisk,
    notes: 'Seed fairness score menggabungkan penerima berulang, keluarga risiko tinggi belum tersentuh, dan ketimpangan RT/RW.',
    metrics: {
      repeatedFamilyCodes: repeated.map((family) => family.noKk),
      uncoveredFamilyCodes: neverReached.map((family) => family.noKk),
      unevenAidByTerritory: true,
      sources: ['APBD Sosial', 'Dana Sosial', 'Program Kesehatan', 'Ekonomi Produktif'],
    },
    calculatedAt: startOfDay(0, 5),
  });

  let anomalyIndex = 1;
  for (const family of repeated) {
    await upsertByUnique('bantuanAnomaly', 'kodeAnomaly', {
      kodeAnomaly: `AID-ANOM-REPEAT-${pad(anomalyIndex, 3)}`,
      tipe: 'repeated_recipient',
      severity: 'high',
      keluargaId: family.id,
      bantuanId: programs[0].id,
      rtId: family.rtId,
      title: 'Penerima bantuan berulang lintas program',
      description: `${family.namaKepala} menerima lebih dari dua bantuan dalam periode pendek.`,
      status: 'open',
      metadata: { noKk: family.noKk, score: family.score },
    });
    anomalyIndex++;
  }
  for (const family of neverReached) {
    await upsertByUnique('bantuanAnomaly', 'kodeAnomaly', {
      kodeAnomaly: `AID-ANOM-UNCOVERED-${pad(anomalyIndex, 3)}`,
      tipe: 'uncovered_high_risk',
      severity: 'critical',
      keluargaId: family.id,
      bantuanId: null,
      rtId: family.rtId,
      title: 'Keluarga risiko tinggi belum menerima bantuan',
      description: `${family.namaKepala} skor ${family.score} belum memiliki catatan penerimaan bantuan.`,
      status: 'open',
      metadata: { noKk: family.noKk, score: family.score },
    });
    anomalyIndex++;
  }
}

async function seedReports(wilayah: WilayahSeed[], createdBy: number) {
  const a = (i: number) => wilayah[Math.min(i, wilayah.length - 1)];
  const reportSpecs = [
    ['JAK-2026-OPS-001', a(0), 0, 'banjir', 'bencana', 'critical', 'eskalasi', 'Genangan 60 cm masuk rumah warga dan balita perlu evakuasi.', -1, null],
    ['JAK-2026-OPS-002', a(1), 2, 'lansia_terlantar', 'sosial', 'critical', 'diproses', 'Lansia tinggal sendiri belum makan dua hari.', 0, null],
    ['JAK-2026-OPS-003', a(0), 1, 'pengangguran', 'ekonomi', 'high', 'baru', 'PHK massal di kontrakan padat, lima KK kehilangan penghasilan.', 0, null],
    ['JAK-2026-OPS-004', a(2), 0, 'jalan_rusak', 'infrastruktur', 'medium', 'selesai', 'Lubang jalan dekat sekolah sudah ditutup sementara.', -5, -2],
    ['JAK-2026-OPS-005', a(3), 3, 'drainase', 'infrastruktur', 'high', 'menunggu_data', 'Saluran mampet menyebabkan air balik saat hujan.', -2, null],
    ['JAK-2026-OPS-006', a(1), 4, 'bantuan_belum_terima', 'bantuan', 'high', 'baru', 'Keluarga prioritas belum menerima sembako dua periode.', 0, null],
    ['JAK-2026-OPS-007', a(2), 2, 'posyandu', 'kesehatan', 'low', 'selesai', 'Permintaan jadwal posyandu tambahan telah difasilitasi.', -7, -6],
    ['JAK-2026-OPS-008', a(0), 5, 'anak_putus_sekolah', 'pendidikan', 'high', 'diproses', 'Anak SMP berhenti sekolah karena biaya transport.', -3, null],
    ['JAK-2026-OPS-009', a(3), 5, 'umkm_turun', 'ekonomi', 'medium', 'diproses', 'Omzet UMKM warung turun setelah harga bahan naik.', -1, null],
    ['JAK-2026-OPS-010', a(1), 1, 'rumah_tidak_layak', 'sosial', 'critical', 'baru', 'Atap kontrakan rubuh, ada penyandang disabilitas.', 0, null],
    ['JAK-2026-OPS-011', a(2), 4, 'aspirasi_warga', 'sosial', 'low', 'selesai', 'Permintaan kegiatan warga selesai ditindaklanjuti.', -12, -10],
    ['JAK-2026-OPS-012', a(3), 0, 'ibu_hamil', 'kesehatan', 'high', 'selesai', 'Ibu hamil risiko tinggi sudah dirujuk puskesmas.', -4, -1],
  ] as const;

  for (const [kode, area, rtOffset, subkategori, kategori, urgency, status, isi, createdOffset, resolvedOffset] of reportSpecs) {
    const rt = area.rts[rtOffset % area.rts.length];
    const report = await prisma.laporanWarga.upsert({
      where: { kodeLaporan: kode },
      update: {
        rtId: rt.id,
        kelurahanId: area.kelurahan.id,
        kecamatanId: area.kecamatan.id,
        kategori,
        subkategori,
        urgencyLevel: urgency,
        status,
        isEmergency: urgency === 'critical',
        isiLaporan: isi,
        lokasiText: rt.label,
        aiSummary: `${kategori}/${subkategori}: ${isi.slice(0, 90)}`,
        aiRecommendation: urgency === 'critical' ? 'Eskalasi lintas wilayah dan kunjungan hari ini.' : 'Tindak lanjut sesuai SLA wilayah.',
        createdAt: startOfDay(createdOffset, 7),
        resolvedAt: resolvedOffset === null ? null : startOfDay(resolvedOffset, 16),
        createdBy,
      },
      create: {
        kodeLaporan: kode,
        channelType: 'web',
        namaPelapor: `Pelapor ${area.kelurahan.nama}`,
        noHpPelapor: `0831${pad(rt.id, 8)}`,
        isiLaporan: isi,
        kategori,
        subkategori,
        urgencyLevel: urgency,
        lokasiText: rt.label,
        rtId: rt.id,
        kelurahanId: area.kelurahan.id,
        kecamatanId: area.kecamatan.id,
        isEmergency: urgency === 'critical',
        status,
        aiSummary: `${kategori}/${subkategori}: ${isi.slice(0, 90)}`,
        aiRecommendation: urgency === 'critical' ? 'Eskalasi lintas wilayah dan kunjungan hari ini.' : 'Tindak lanjut sesuai SLA wilayah.',
        createdAt: startOfDay(createdOffset, 7),
        resolvedAt: resolvedOffset === null ? null : startOfDay(resolvedOffset, 16),
        createdBy,
      },
    });

    const existingMessage = await prisma.laporanMessage.findFirst({ where: { laporanId: report.id, senderType: 'seed' } });
    if (!existingMessage) {
      await prisma.laporanMessage.create({
        data: {
          laporanId: report.id,
          senderType: 'seed',
          messageText: `Seed governance timeline: status=${status}; responseArea=${area.kelurahan.risk === 'low' ? 'active' : 'passive'}`,
          isInternal: true,
        },
      });
    }
  }
}

async function seedTerritorialIntelligence(wilayah: WilayahSeed[]) {
  for (let i = 0; i < wilayah.length; i++) {
    const area = wilayah[i];
    const risk = area.kelurahan.risk;
    const label = `${area.kelurahan.nama}, ${area.kecamatan.nama}`;
    const isPassive = risk === 'high' && i !== 0;
    const vulnerableFamilies = risk === 'high' ? 28 + i * 3 : risk === 'medium' ? 13 : 5;
    const economicStressScore = risk === 'high' ? 86 + i : risk === 'medium' ? 62 : 28;
    const foodRiskScore = risk === 'high' ? 82 + i : risk === 'medium' ? 55 : 22;

    await upsertByUnique('territorialSocialProfile', 'kodeProfile', {
      kodeProfile: `TSP-KEL-${area.kelurahan.id}`,
      wilayahLevel: 'kelurahan',
      wilayahId: area.kelurahan.id,
      label,
      densityLevel: risk === 'high' ? 'dense_poor_area' : risk === 'medium' ? 'industrial_buffer' : 'active_kelurahan',
      povertyRisk: risk,
      activeStatus: isPassive ? 'passive' : 'active',
      vulnerableFamilies,
      elderlyCount: risk === 'high' ? 18 : 7,
      childrenCount: risk === 'high' ? 61 : risk === 'medium' ? 34 : 18,
      disabilityCount: risk === 'high' ? 9 : 2,
      notes: `seed=territorial; floodProne=${i < 2}; economicStress=${economicStressScore}`,
    });

    await upsertByUnique('territorialEconomicSnapshot', 'kodeSnapshot', {
      kodeSnapshot: `TES-KEL-${area.kelurahan.id}-2026-05`,
      wilayahLevel: 'kelurahan',
      wilayahId: area.kelurahan.id,
      unemploymentRate: risk === 'high' ? 0.22 : risk === 'medium' ? 0.12 : 0.04,
      avgIncome: risk === 'high' ? 1450000 : risk === 'medium' ? 3300000 : 7200000,
      umkmCount: risk === 'high' ? 12 : risk === 'medium' ? 9 : 18,
      informalWorkerRate: risk === 'high' ? 0.68 : risk === 'medium' ? 0.39 : 0.18,
      economicStressScore,
      capturedAt: startOfDay(0, 5),
    });

    await upsertByUnique('foodSecuritySnapshot', 'kodeSnapshot', {
      kodeSnapshot: `FSS-KEL-${area.kelurahan.id}-2026-05`,
      wilayahLevel: 'kelurahan',
      wilayahId: area.kelurahan.id,
      foodRiskScore,
      mealGapFamilies: risk === 'high' ? 14 + i : risk === 'medium' ? 5 : 1,
      staplePriceIndex: risk === 'high' ? 1.18 : risk === 'medium' ? 1.07 : 0.98,
      notes: risk === 'high' ? 'Harga pangan naik dan keluarga rentan melewatkan makan.' : 'Stabil.',
      capturedAt: startOfDay(0, 5),
    });

    await upsertByUnique('territorialStressSignal', 'kodeSignal', {
      kodeSignal: `TSS-KEL-${area.kelurahan.id}-ECON`,
      wilayahLevel: 'kelurahan',
      wilayahId: area.kelurahan.id,
      signalType: risk === 'high' ? 'poverty_food_governance' : risk === 'medium' ? 'economic_stress' : 'active_response',
      severity: risk === 'high' ? 'critical' : risk === 'medium' ? 'high' : 'low',
      score: risk === 'high' ? 91 : risk === 'medium' ? 63 : 24,
      description: risk === 'high' ? 'Wilayah padat miskin dengan laporan critical dan bantuan tidak merata.' : risk === 'medium' ? 'Tekanan ekonomi UMKM dan pekerja informal.' : 'Wilayah aktif, respons cepat.',
      status: risk === 'low' ? 'monitoring' : 'open',
    });

    if (i < 2) {
      const event = await upsertByUnique('disasterEvent', 'kodeEvent', {
        kodeEvent: `DST-FLOOD-${area.kelurahan.id}-2026-05`,
        wilayahLevel: 'kelurahan',
        wilayahId: area.kelurahan.id,
        eventType: 'flood',
        severity: i === 0 ? 'critical' : 'high',
        occurredAt: startOfDay(-1, 4),
        affectedFamilies: i === 0 ? 32 : 21,
        status: 'active',
        description: `Seed flood-prone event for ${label}.`,
      });

      await upsertByUnique('governmentResponse', 'kodeResponse', {
        kodeResponse: `GOV-RESP-${area.kelurahan.id}-FLOOD`,
        eventId: event.id,
        laporanId: null,
        wilayahLevel: 'kelurahan',
        wilayahId: area.kelurahan.id,
        responseType: 'field_visit_and_logistics',
        status: i === 0 ? 'delayed' : 'in_progress',
        responseDelayHours: i === 0 ? 18 : 6,
        startedAt: startOfDay(-1, i === 0 ? 22 : 10),
        completedAt: null,
        notes: i === 0 ? 'Response delay due to passive coordination.' : 'Response active with kelurahan coordination.',
      });
    } else {
      await upsertByUnique('governmentResponse', 'kodeResponse', {
        kodeResponse: `GOV-RESP-${area.kelurahan.id}-SOCIAL`,
        eventId: null,
        laporanId: null,
        wilayahLevel: 'kelurahan',
        wilayahId: area.kelurahan.id,
        responseType: 'social_monitoring',
        status: risk === 'low' ? 'completed' : 'in_progress',
        responseDelayHours: risk === 'low' ? 2 : 9,
        startedAt: startOfDay(-2, 9),
        completedAt: risk === 'low' ? startOfDay(-2, 11) : null,
        notes: risk === 'low' ? 'Active kelurahan resolved issue quickly.' : 'Economic stress case in progress.',
      });
    }
  }
}

async function seedOperationalAlerts(outlets: { id: number; kodeOutlet: string; namaOutlet: string }[], createdBy: number) {
  const alerts = [
    { kode: 'OPS-WRM-LOW-STOCK', kategori: 'warmindo', severity: 'high' as const, entityId: outlets[0].id, judul: 'Stok bahan kritis', deskripsi: 'Mie, telur, dan LPG di outlet Kapuk berada di bawah stok minimum.', metadata: { anomaly: 'low_stock' } },
    { kode: 'OPS-WRM-HIGH-EXPENSE', kategori: 'warmindo', severity: 'high' as const, entityId: outlets[1].id, judul: 'Pengeluaran mendadak menekan margin', deskripsi: 'Biaya perbaikan freezer membuat profit drop pada outlet Angke.', metadata: { anomaly: 'high_expense' } },
    { kode: 'OPS-WRM-OVERLOAD', kategori: 'warmindo', severity: 'medium' as const, entityId: outlets[3].id, judul: 'Outlet overload saat jam makan', deskripsi: 'Volume transaksi Pondok Bambu tinggi dibanding kapasitas shift.', metadata: { anomaly: 'outlet_overload' } },
    { kode: 'OPS-GOV-PASSIVE-AREA', kategori: 'governance', severity: 'critical' as const, entityId: null, judul: 'Wilayah pasif butuh supervisi', deskripsi: 'Area risiko tinggi memiliki laporan critical belum selesai dan distribusi bantuan tidak merata.', metadata: { anomaly: 'territorial_stress' } },
  ];

  for (const alert of alerts) {
    await prisma.operationalAlert.upsert({
      where: { kodeAlert: alert.kode },
      update: {
        kategori: alert.kategori,
        severity: alert.severity,
        status: 'open',
        entityId: alert.entityId,
        metadata: alert.metadata,
      },
      create: {
        kodeAlert: alert.kode,
        kategori: alert.kategori,
        severity: alert.severity,
        status: 'open',
        judul: alert.judul,
        deskripsi: alert.deskripsi,
        source: 'seed',
        entityType: alert.entityId ? 'warmindo_outlet' : 'governance',
        entityId: alert.entityId,
        metadata: alert.metadata,
        createdBy,
      },
    });
  }
}

async function upsertAiTask(tipe: string, inputData: any, outputData: any, createdBy: number) {
  const existing = await prisma.aiTask.findFirst({ where: { tipe } });
  const data = {
    inputData,
    outputData,
    status: 'done' as const,
    modelUsed: 'seed-local-foundation',
    createdBy,
    startedAt: startOfDay(-1, 10),
    doneAt: startOfDay(-1, 10),
  };
  if (existing) return prisma.aiTask.update({ where: { id: existing.id }, data });
  return prisma.aiTask.create({ data: { tipe, ...data } });
}

async function upsertAiReport(tipe: string, wilayahLevel: string, wilayahId: number | null, ringkasan: string, temuan: any[], rekomendasi: any[]) {
  const existing = await prisma.aiReport.findFirst({ where: { tipe } });
  const data = {
    wilayahLevel,
    wilayahId,
    tanggal: startOfDay(0, 6),
    ringkasan,
    temuan,
    rekomendasi,
  };
  if (existing) return prisma.aiReport.update({ where: { id: existing.id }, data });
  return prisma.aiReport.create({ data: { tipe, ...data } });
}

async function seedAiFoundation(wilayah: WilayahSeed[], createdBy: number) {
  await upsertAiTask(
    'seed_poverty_risk_analysis',
    { scope: 'rt', signals: ['income', 'housing', 'bpjs_pbi', 'unemployment', 'children', 'elderly', 'disability'] },
    { finding: 'Kapuk dan Angke memiliki konsentrasi risiko kemiskinan lebih tinggi.', priority: 'critical' },
    createdBy,
  );
  await upsertAiTask(
    'seed_aid_fairness_audit',
    { scope: 'keluarga', signals: ['repeatAid', 'neverAid', 'priorityScore'] },
    { finding: 'Ada penerima berulang dan keluarga skor tinggi belum tersentuh.', priority: 'critical' },
    createdBy,
  );
  await upsertAiTask(
    'seed_warmindo_anomaly_detection',
    { scope: 'warmindo', signals: ['low_stock', 'high_expense', 'profit_drop', 'overload'] },
    { finding: 'Tiga outlet membutuhkan intervensi operasional.', priority: 'high' },
    createdBy,
  );

  await upsertAiReport(
    'daily_operational_stress',
    'provinsi',
    null,
    'Wilayah risiko tinggi menunjukkan kombinasi bantuan tidak merata, laporan critical, dan kerentanan ekonomi.',
    [
      { tipe: 'poverty_risk', wilayah: 'Kapuk/Angke', severity: 'critical' },
      { tipe: 'aid_fairness', wilayah: 'Kapuk', severity: 'critical' },
      { tipe: 'warmindo_anomaly', wilayah: 'Angke/Pondok Bambu', severity: 'high' },
    ],
    [
      { aksi: 'Prioritaskan kunjungan keluarga skor >80 tanpa bantuan', prioritas: 'critical' },
      { aksi: 'Audit penerima bantuan berulang sebelum distribusi berikutnya', prioritas: 'high' },
      { aksi: 'Replenish stok Warmindo Kapuk dan evaluasi biaya Angke', prioritas: 'high' },
    ],
  );

  await upsertAiReport(
    'kelurahan_kapuk_poverty_risk',
    'kelurahan',
    wilayah[0].kelurahan.id,
    'Kapuk memiliki tekanan sosial ekonomi paling tinggi dalam seed operasional.',
    [{ tipe: 'unemployment', count: 'tinggi' }, { tipe: 'housing', condition: 'kontrak_padat' }],
    [{ aksi: 'Gabungkan verifikasi bansos dengan pendataan kerja UMKM', prioritas: 'critical' }],
  );
}

async function seedAiGovernanceMemory(wilayah: WilayahSeed[], createdBy: number) {
  const povertyObservation = await upsertByUnique('aIObservation', 'kodeObservation', {
    kodeObservation: 'AIO-POVERTY-KAPUK-001',
    domain: 'poverty',
    title: 'Risiko kemiskinan Kapuk meningkat',
    summary: 'Kombinasi pengangguran, kontrakan padat, BPJS PBI, dan food risk tinggi.',
    severity: 'critical',
    evidence: { wilayah: 'Kapuk', signals: ['unemployment', 'food_risk', 'housing_density'] },
    wilayahLevel: 'kelurahan',
    wilayahId: wilayah[0].kelurahan.id,
    status: 'open',
  });

  const aidObservation = await upsertByUnique('aIObservation', 'kodeObservation', {
    kodeObservation: 'AIO-AID-FAIRNESS-001',
    domain: 'aid_fairness',
    title: 'Distribusi bantuan tidak merata',
    summary: 'Penerima berulang ditemukan bersamaan dengan keluarga skor tinggi yang belum menerima bantuan.',
    severity: 'critical',
    evidence: { repeatedRecipients: true, uncoveredHighRisk: true },
    wilayahLevel: 'provinsi',
    wilayahId: null,
    status: 'open',
  });

  const warmindoObservation = await upsertByUnique('aIObservation', 'kodeObservation', {
    kodeObservation: 'AIO-WRM-ANOMALY-001',
    domain: 'warmindo',
    title: 'Anomali operasional Warmindo',
    summary: 'Low stock Kapuk, high expense Angke, dan overload Pondok Bambu perlu intervensi.',
    severity: 'high',
    evidence: { lowStock: true, highExpense: true, overload: true },
    wilayahLevel: 'provinsi',
    wilayahId: null,
    status: 'open',
  });

  const floodObservation = await upsertByUnique('aIObservation', 'kodeObservation', {
    kodeObservation: 'AIO-FLOOD-RESPONSE-001',
    domain: 'disaster_response',
    title: 'Respons banjir pasif terlambat',
    summary: 'Flood-prone area menunjukkan delay koordinasi dan butuh response tracking.',
    severity: 'critical',
    evidence: { responseDelayHours: 18 },
    wilayahLevel: 'kelurahan',
    wilayahId: wilayah[0].kelurahan.id,
    status: 'open',
  });

  const povertyHypothesis = await upsertByUnique('aIHypothesis', 'kodeHypothesis', {
    kodeHypothesis: 'AIH-POVERTY-001',
    observationId: povertyObservation.id,
    statement: 'Food risk dan pengangguran kepala keluarga adalah penyebab utama tekanan sosial Kapuk.',
    confidence: 0.78,
    supportingData: { householdScore: 'high', mealGapFamilies: 'high' },
    status: 'testing',
  });

  const aidRecommendation = await upsertByUnique('aIRecommendation', 'kodeRecommendation', {
    kodeRecommendation: 'AIR-AID-FAIRNESS-001',
    observationId: aidObservation.id,
    hypothesisId: povertyHypothesis.id,
    domain: 'aid_fairness',
    recommendation: 'Bekukan distribusi penerima berulang sampai keluarga skor >80 yang belum menerima diverifikasi.',
    priority: 'critical',
    expectedImpact: 'Menurunkan uncovered high-risk families dan meningkatkan fairness score.',
    status: 'accepted',
  });

  const warmindoRecommendation = await upsertByUnique('aIRecommendation', 'kodeRecommendation', {
    kodeRecommendation: 'AIR-WRM-OPS-001',
    observationId: warmindoObservation.id,
    hypothesisId: null,
    domain: 'warmindo',
    recommendation: 'Replenish stok Kapuk, audit biaya freezer Angke, dan tambah shift Pondok Bambu.',
    priority: 'high',
    expectedImpact: 'Mengurangi lost sales dan cash variance.',
    status: 'proposed',
  });

  const floodRecommendation = await upsertByUnique('aIRecommendation', 'kodeRecommendation', {
    kodeRecommendation: 'AIR-FLOOD-RESPONSE-001',
    observationId: floodObservation.id,
    hypothesisId: null,
    domain: 'disaster_response',
    recommendation: 'Aktifkan response team lintas RW untuk Kapuk saat curah hujan tinggi.',
    priority: 'critical',
    expectedImpact: 'Response delay turun dari 18 jam menjadi kurang dari 6 jam.',
    status: 'rejected',
  });

  const acceptedDecision = await upsertByUnique('humanDecision', 'kodeDecision', {
    kodeDecision: 'HD-AID-FAIRNESS-001',
    recommendationId: aidRecommendation.id,
    decidedBy: createdBy,
    decision: 'accepted',
    reason: 'Diperlukan sebelum distribusi berikutnya agar bantuan lebih adil.',
    decidedAt: startOfDay(0, 11),
  });

  const rejectedDecision = await upsertByUnique('humanDecision', 'kodeDecision', {
    kodeDecision: 'HD-FLOOD-RESPONSE-001',
    recommendationId: floodRecommendation.id,
    decidedBy: createdBy,
    decision: 'rejected',
    reason: 'Koordinasi BPBD belum tersedia di runtime lokal.',
    decidedAt: startOfDay(0, 12),
  });

  await upsertByUnique('outcomeTracking', 'kodeOutcome', {
    kodeOutcome: 'OUT-AID-FAIRNESS-001',
    recommendationId: aidRecommendation.id,
    decisionId: acceptedDecision.id,
    metricName: 'fairness_score',
    baselineValue: 54,
    currentValue: 68,
    targetValue: 80,
    status: 'tracking',
    notes: 'Accepted decision mulai memperbaiki coverage keluarga risiko tinggi.',
    measuredAt: startOfDay(0, 18),
  });

  await upsertByUnique('outcomeTracking', 'kodeOutcome', {
    kodeOutcome: 'OUT-FLOOD-RESPONSE-001',
    recommendationId: floodRecommendation.id,
    decisionId: rejectedDecision.id,
    metricName: 'response_delay_hours',
    baselineValue: 18,
    currentValue: 18,
    targetValue: 6,
    status: 'failed',
    notes: 'Recommendation rejected, response delay unchanged.',
    measuredAt: startOfDay(0, 18),
  });

  await upsertByUnique('aILearningMemory', 'kodeMemory', {
    kodeMemory: 'AILM-AID-001',
    domain: 'aid_fairness',
    lesson: 'Fairness score improves when repeated-recipient review is combined with high-risk verification.',
    evidence: { acceptedDecision: acceptedDecision.kodeDecision, metric: 'fairness_score' },
    confidence: 0.74,
  });

  await upsertByUnique('aIFailureMemory', 'kodeFailure', {
    kodeFailure: 'AIFM-FLOOD-001',
    domain: 'disaster_response',
    failedRecommendation: floodRecommendation.recommendation,
    failureReason: 'Operational dependency on external response team not available.',
    mitigation: 'Add government response integration and escalation owner before auto-recommending dispatch.',
  });

  await upsertByUnique('aICausalInference', 'kodeCausal', {
    kodeCausal: 'AICI-POVERTY-FOOD-001',
    cause: 'Pengangguran kepala keluarga dan harga pangan naik',
    effect: 'Food risk dan laporan bantuan meningkat',
    confidence: 0.69,
    evidence: { area: 'Kapuk', reports: ['bantuan', 'ekonomi'], foodRiskScore: 'high' },
    domain: 'poverty',
  });

  await upsertByUnique('aIRecommendation', 'kodeRecommendation', {
    kodeRecommendation: 'AIR-WRM-FAILED-001',
    observationId: warmindoObservation.id,
    hypothesisId: null,
    domain: 'warmindo',
    recommendation: 'Naikkan harga semua produk 25% secara serentak.',
    priority: 'medium',
    expectedImpact: 'Meningkatkan margin, tetapi berisiko menurunkan permintaan.',
    status: 'failed',
  });
}

async function seedOfficialProfile() {
  await prisma.publicOfficial.upsert({
    where: { id: 1 },
    update: {
      namaLengkap: 'Sigit Purnomo Said',
      jabatan: 'Anggota DPR RI',
      lembaga: 'DPR RI',
      aktif: true,
    },
    create: {
      namaLengkap: 'Sigit Purnomo Said',
      gelarBelakang: 'S.A.P.',
      jabatan: 'Anggota DPR RI',
      lembaga: 'DPR RI',
      fraksi: 'Fraksi PAN',
      partai: 'PAN',
      komisi: 'Komisi VIII DPR RI',
      dapil: 'DKI Jakarta II',
      periode: '2024-2029',
      fokusKomisi: ['Sosial', 'Bantuan Sosial', 'Kebencanaan', 'Kelompok Rentan', 'Pemberdayaan Ekonomi'],
      waAspirasi: '6281234567890',
      instagram: '@sigitpurnomosaid',
      bioSingkat: 'Profil seed untuk runtime lokal JAKDATA.',
      visi: 'Jakarta yang adil dan sejahtera.',
      misi: ['Bantuan tepat sasaran', 'Pemberdayaan UMKM', 'Perlindungan kelompok rentan'],
      aktif: true,
    },
  });
}

async function printCounts() {
  console.log('[seed] printCounts: start (sequential, one query at a time)');
  const run = async (label: string, fn: () => Promise<number>) => {
    process.stdout.write(`[seed] count ${label}... `);
    const n = await fn();
    console.log(n);
    return n;
  };

  const users = await run('user', () => prisma.user.count());
  const families = await run('keluarga', () => prisma.keluarga.count());
  const warga = await run('warga', () => prisma.warga.count());
  const warmindo = await run('warmindoOutlet', () => prisma.warmindoOutlet.count());
  const reports = await run('laporanWarga', () => prisma.laporanWarga.count());
  const aidRecords = await run('bantuanPenerima', () => prisma.bantuanPenerima.count());
  const aiTasks = await run('aiTask', () => prisma.aiTask.count());
  const aiReports = await run('aiReport', () => prisma.aiReport.count());
  const alerts = await run('operationalAlert', () => prisma.operationalAlert.count());
  const products = await run('warmindoProduct', () => (prisma as any).warmindoProduct.count());
  const saleLines = await run('warmindoSaleLineItem', () => (prisma as any).warmindoSaleLineItem.count());
  const attendance = await run('warmindoAttendance', () => (prisma as any).warmindoAttendance.count());
  const fairness = await run('bantuanFairnessSnapshot', () => (prisma as any).bantuanFairnessSnapshot.count());
  const territories = await run('territorialStressSignal', () => (prisma as any).territorialStressSignal.count());
  const aiMemory = await run('aIRecommendation', () => (prisma as any).aIRecommendation.count());

  console.log('[seed] printCounts: summary');
  console.log(
    JSON.stringify(
      {
        users,
        families,
        warga,
        warmindoOutlets: warmindo,
        warmindoProducts: products,
        saleLines,
        attendance,
        reports,
        aidRecords,
        fairnessSnapshots: fairness,
        territorialSignals: territories,
        aiRecords: aiTasks + aiReports + aiMemory,
        operationalAlerts: alerts,
      },
      null,
      2,
    ),
  );
  console.log('[seed] printCounts: done');
}

async function main() {
  const seedMode = (process.env.SEED_MODE ?? 'medium').toLowerCase();
  console.log(`Seeding operational data foundation (SEED_MODE=${seedMode})...`);
  console.log('[seed] connecting database (single-client, pool-safe URL)...');
  await prisma.$connect();
  console.log('[seed] connected.');

  console.log('[seed] step: seedWilayah');
  const wilayah = await seedWilayah();
  console.log('[seed] step: upsertUser admin');
  const admin = await upsertUser({ email: 'admin@jakdata.id', nama: 'Administrator JAKDATA', role: 'admin_pusat' });
  console.log('[seed] step: seedPopulation');
  const families = await seedPopulation(wilayah, admin.id);
  console.log('[seed] step: seedUmkm');
  await seedUmkm(families, admin.id);
  console.log('[seed] step: seedWarmindo');
  const outlets = await seedWarmindo(wilayah);
  if (seedMode !== 'small') {
    console.log('[seed] step: seedWarmindoFieldOps');
    await seedWarmindoFieldOps(outlets);
  } else {
    console.log('[seed] skip seedWarmindoFieldOps (SEED_MODE=small)');
  }
  console.log('[seed] step: seedRoleUsers');
  await seedRoleUsers(wilayah, outlets);
  console.log('[seed] step: seedAidAndFairness');
  await seedAidAndFairness(families, admin.id);
  console.log('[seed] step: seedReports');
  await seedReports(wilayah, admin.id);
  console.log('[seed] step: seedTerritorialIntelligence');
  await seedTerritorialIntelligence(wilayah);
  console.log('[seed] step: seedOperationalAlerts');
  await seedOperationalAlerts(outlets, admin.id);
  console.log('[seed] step: seedAiFoundation');
  await seedAiFoundation(wilayah, admin.id);
  if (seedMode !== 'small') {
    console.log('[seed] step: seedAiGovernanceMemory');
    await seedAiGovernanceMemory(wilayah, admin.id);
  } else {
    console.log('[seed] skip seedAiGovernanceMemory (SEED_MODE=small)');
  }
  console.log('[seed] step: seedOfficialProfile');
  await seedOfficialProfile();
  console.log('[seed] step: printCounts');
  await printCounts();

  console.log('Password operasional untuk akun seed (Data Awal Sistem): admin123');
  console.log('[seed] finished OK.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
      console.log('[seed] prisma disconnected.');
    } catch (e) {
      console.error('[seed] disconnect error', e);
    }
  });
