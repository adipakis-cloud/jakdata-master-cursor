/**
 * Upserts koordinator + sample petugas accounts for Dapil 3 wilayah
 * (kota kode 3172, 3173, 3101). Requires wilayah rows (e.g. seed:dapil3).
 */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DAPIL3_KOTA_KODES = ['3172', '3173', '3101'] as const;
const SEED_PASSWORD = 'Jakdata2026!';

function kecEmailKode(kec: { kode: string | null; id: number }) {
  return (kec.kode && String(kec.kode).trim()) || `id${kec.id}`;
}

function kelEmailKode(kel: { kode: string | null; id: number }) {
  return (kel.kode && String(kel.kode).trim()) || `id${kel.id}`;
}

async function upsertWilayahUser(args: {
  email: string;
  nama: string;
  role: UserRole;
  kecamatanId?: number | null;
  kelurahanId?: number | null;
  rwId?: number | null;
  rtId?: number | null;
}) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: args.email },
    update: {
      nama: args.nama,
      role: args.role,
      passwordHash,
      aktif: true,
      kotaId: null,
      kecamatanId: args.kecamatanId ?? null,
      kelurahanId: args.kelurahanId ?? null,
      rwId: args.rwId ?? null,
      rtId: args.rtId ?? null,
      warmindoId: null,
      loginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      nama: args.nama,
      email: args.email,
      passwordHash,
      role: args.role,
      aktif: true,
      kecamatanId: args.kecamatanId ?? null,
      kelurahanId: args.kelurahanId ?? null,
      rwId: args.rwId ?? null,
      rtId: args.rtId ?? null,
      warmindoId: null,
    },
  });
}

async function main() {
  const kecamatanList = await prisma.kecamatan.findMany({
    where: { kota: { kode: { in: [...DAPIL3_KOTA_KODES] } } },
    orderBy: [{ kotaId: 'asc' }, { id: 'asc' }],
  });

  let nKec = 0;
  let nPetugas = 0;
  let nKel = 0;
  let nRw = 0;
  let nRt = 0;

  for (const kec of kecamatanList) {
    const kodeKec = kecEmailKode(kec);
    await upsertWilayahUser({
      email: `koordinator.kec.${kodeKec}@jakdata.id`,
      nama: `Koordinator Kecamatan ${kec.nama}`,
      role: 'koordinator_kecamatan',
      kecamatanId: kec.id,
    });
    nKec++;

    await upsertWilayahUser({
      email: `petugas.${kodeKec}@jakdata.id`,
      nama: `Petugas ${kec.nama}`,
      role: 'petugas_lapangan',
      kecamatanId: kec.id,
    });
    nPetugas++;
  }

  const kelurahanList = await prisma.kelurahan.findMany({
    where: { kecamatan: { kota: { kode: { in: [...DAPIL3_KOTA_KODES] } } } },
    orderBy: [{ kecamatanId: 'asc' }, { id: 'asc' }],
  });

  for (const kel of kelurahanList) {
    await upsertWilayahUser({
      email: `koordinator.kel.${kelEmailKode(kel)}@jakdata.id`,
      nama: `Koordinator Kelurahan ${kel.nama}`,
      role: 'koordinator_kelurahan',
      kecamatanId: kel.kecamatanId,
      kelurahanId: kel.id,
    });
    nKel++;

    const rws = await prisma.rW.findMany({
      where: { kelurahanId: kel.id },
      orderBy: { nomor: 'asc' },
      take: 3,
    });

    for (const rw of rws) {
      await upsertWilayahUser({
        email: `koordinator.rw.${kel.id}.${rw.nomor}@jakdata.id`,
        nama: `Koordinator RW ${kel.nama} RW ${rw.nomor}`,
        role: 'koordinator_rw',
        kecamatanId: kel.kecamatanId,
        kelurahanId: kel.id,
        rwId: rw.id,
      });
      nRw++;

      const rt = await prisma.rT.findFirst({
        where: { rwId: rw.id },
        orderBy: { nomor: 'asc' },
      });
      if (!rt) continue;

      await upsertWilayahUser({
        email: `koordinator.rt.${rw.id}.${rt.nomor}@jakdata.id`,
        nama: `Koordinator RT ${kel.nama} RW${rw.nomor} RT${rt.nomor}`,
        role: 'koordinator_rt',
        kecamatanId: kel.kecamatanId,
        kelurahanId: kel.id,
        rwId: rw.id,
        rtId: rt.id,
      });
      nRt++;
    }
  }

  console.log('[seed-koordinator-dapil3] upserted:');
  console.log('  koordinator_kecamatan:', nKec);
  console.log('  petugas_lapangan:', nPetugas);
  console.log('  koordinator_kelurahan:', nKel);
  console.log('  koordinator_rw (max 3 per kel):', nRw);
  console.log('  koordinator_rt (1st RT of each sampled RW):', nRt);
  console.log('  password (all new accounts):', SEED_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
