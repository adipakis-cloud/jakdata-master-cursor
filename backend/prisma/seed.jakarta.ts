// ================================================================
// JAKDATA — Production Seed Jakarta
// Hanya struktur wilayah + admin user
// Tanpa Data Awal Sistem tambahan
// ================================================================
import { PrismaClient } from '@prisma/client';
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
const pad = (n: number, l = 3) => String(n).padStart(l, '0');

const JAKARTA: Record<string, { kode: string; tipe?: string; kecamatan: Record<string, string[]> }> = {
  'Jakarta Pusat': { kode: 'JAKPUS', kecamatan: { 'Gambir': ['Gambir','Cideng','Petojo Selatan','Petojo Utara','Kebon Kelapa','Duri Pulo'], 'Sawah Besar': ['Pasar Baru','Kartini','Gunung Sahari Utara','Mangga Dua Selatan','Karang Anyar'], 'Kemayoran': ['Kemayoran','Kebon Kosong','Harapan Mulia','Cempaka Baru','Sumur Batu','Utan Panjang','Serdang','Rawasari'], 'Senen': ['Senen','Kramat','Kwitang','Kenari','Paseban','Bungur'], 'Cempaka Putih': ['Cempaka Putih Timur','Cempaka Putih Barat','Rawasari'], 'Menteng': ['Menteng','Pegangsaan','Cikini','Gondangdia','Kebon Sirih'], 'Tanah Abang': ['Tanah Abang','Kampung Bali','Karet','Karet Tengsin','Petamburan','Kebon Kacang','Kebon Melati','Gelora'], 'Johar Baru': ['Johar Baru','Kampung Rawa','Galur','Tanah Tinggi'] } },
  'Jakarta Utara': { kode: 'JAKUT', kecamatan: { 'Penjaringan': ['Penjaringan','Pluit','Kamal Muara','Kapuk Muara','Pejagalan'], 'Pademangan': ['Pademangan Barat','Pademangan Timur','Ancol'], 'Tanjung Priok': ['Tanjung Priok','Sunter Jaya','Sunter Agung','Papanggo','Sungai Bambu','Kebon Bawang'], 'Koja': ['Koja','Lagoa','Rawa Badak Selatan','Rawa Badak Utara','Tugu Selatan','Tugu Utara'], 'Cilincing': ['Cilincing','Semper Barat','Semper Timur','Rorotan','Marunda','Kalibaru','Sukapura'], 'Kelapa Gading': ['Kelapa Gading Barat','Kelapa Gading Timur','Pegangsaan Dua'] } },
  'Jakarta Barat': { kode: 'JAKBAR', kecamatan: { 'Cengkareng': ['Cengkareng Barat','Cengkareng Timur','Duri Kosambi','Kapuk','Kedaung Kali Angke','Rawa Buaya'], 'Grogol Petamburan': ['Grogol','Jelambar','Jelambar Baru','Tanjung Duren Selatan','Tanjung Duren Utara','Tomang','Wijaya Kusuma'], 'Tambora': ['Angke','Duri Selatan','Duri Utara','Jembatan Besi','Jembatan Lima','Kali Anyar','Krendang','Pekojan','Roa Malaka','Tambora','Tanah Sereal'], 'Taman Sari': ['Taman Sari','Glodok','Krukut','Mangga Besar','Maphar','Pinangsia','Tangki'], 'Kebon Jeruk': ['Duri Kepa','Kebon Jeruk','Kelapa Dua','Kedoya Selatan','Kedoya Utara','Sukabumi Selatan','Sukabumi Utara'], 'Palmerah': ['Palmerah','Slipi','Kota Bambu Utara','Kota Bambu Selatan','Jati Pulo','Kemanggisan'], 'Kalideres': ['Kalideres','Pegadungan','Semanan','Tegal Alur','Kamal'], 'Kembangan': ['Kembangan Utara','Kembangan Selatan','Joglo','Srengseng','Meruya Selatan','Meruya Utara'] } },
  'Jakarta Selatan': { kode: 'JAKSEL', kecamatan: { 'Tebet': ['Tebet Barat','Tebet Timur','Kebon Baru','Bukit Duri','Menteng Dalam','Manggarai','Manggarai Selatan'], 'Setiabudi': ['Setiabudi','Kuningan Timur','Karet','Karet Semanggi','Karet Kuningan','Guntur','Pasar Manggis','Menteng Atas'], 'Mampang Prapatan': ['Mampang Prapatan','Bangka','Pela Mampang','Tegal Parang','Kuningan Barat'], 'Pasar Minggu': ['Pasar Minggu','Kebagusan','Pejaten Barat','Pejaten Timur','Jati Padang','Cilandak Timur','Ragunan'], 'Jagakarsa': ['Jagakarsa','Srengseng Sawah','Ciganjur','Lenteng Agung','Tanjung Barat','Cipedak'], 'Pesanggrahan': ['Pesanggrahan','Bintaro','Ulujami','Petukangan Selatan','Petukangan Utara'], 'Cilandak': ['Cilandak Barat','Lebak Bulus','Gandaria Selatan','Cipete Selatan','Pondok Labu'], 'Kebayoran Baru': ['Senayan','Selong','Rawa Barat','Gandaria Utara','Cipete Utara','Pulo','Gunung','Kramat Pela','Petogogan','Melawai'], 'Kebayoran Lama': ['Kebayoran Lama Utara','Kebayoran Lama Selatan','Grogol Selatan','Grogol Utara','Cipulir','Pondok Pinang'], 'Pancoran': ['Pancoran','Kalibata','Rawajati','Duren Tiga','Pengadegan','Cikoko'] } },
  'Jakarta Timur': { kode: 'JAKTIM', kecamatan: { 'Matraman': ['Matraman','Palmeriam','Utan Kayu Selatan','Utan Kayu Utara','Pisangan Baru','Kebon Manggis'], 'Pulogadung': ['Pulogadung','Jatinegara Kaum','Pisangan Timur','Cipinang Cempedak','Cipinang Muara','Rawamangun','Kayu Putih'], 'Jatinegara': ['Kampung Melayu','Bidara Cina','Cipinang Besar Selatan','Cipinang Besar Utara','Cipinang','Rawa Bunga','Balimester'], 'Kramat Jati': ['Kramat Jati','Cililitan','Cawang','Dukuh','Batu Ampar','Balekambang','Tengah'], 'Ciracas': ['Ciracas','Susukan','Kelapa Dua Wetan','Cibubur','Rambutan'], 'Cipayung': ['Cipayung','Munjul','Pondok Rangon','Cilangkap','Setu','Bambu Apus','Lubang Buaya','Ceger'], 'Cakung': ['Cakung Timur','Cakung Barat','Pulo Gebang','Ujung Menteng','Penggilingan','Rawa Terate'], 'Duren Sawit': ['Duren Sawit','Pondok Bambu','Klender','Pondok Kelapa','Malaka Sari','Malaka Jaya','Pondok Kopi'], 'Makasar': ['Makasar','Cipinang Melayu','Halim Perdana Kusuma','Kebon Pala','Pinang Ranti'], 'Pasar Rebo': ['Pasar Rebo','Cijantung','Kalisari','Baru','Gedong'] } },
  'Kepulauan Seribu': { kode: 'KEPSER', tipe: 'kabupaten', kecamatan: { 'Kepulauan Seribu Utara': ['Pulau Harapan','Pulau Kelapa','Pulau Panggang'], 'Kepulauan Seribu Selatan': ['Pulau Pari','Pulau Tidung','Pulau Untung Jawa'] } },
};

async function main() {
  console.log('🌱 JAKDATA Production Seed — Wilayah Jakarta Lengkap');
  console.log('⚠️  Mode: PRODUCTION — tanpa seed Data Awal Sistem tambahan\n');

  const dki = await prisma.provinsi.upsert({ where: { kode: 'DKI' }, update: {}, create: { nama: 'DKI Jakarta', kode: 'DKI' } });

  let ktCount = 0, kecCount = 0, kelCount = 0, rwCount = 0, rtCount = 0;

  for (const [namaKota, d] of Object.entries(JAKARTA)) {
    const kota = await prisma.kota.upsert({ where: { kode: d.kode }, update: {}, create: { provinsiId: dki.id, nama: namaKota, kode: d.kode, tipe: d.tipe ?? 'kota' } });
    ktCount++;

    for (const [namaKec, kelList] of Object.entries(d.kecamatan)) {
      const kec = await prisma.kecamatan.upsert({ where: { kotaId_nama: { kotaId: kota.id, nama: namaKec } }, update: {}, create: { kotaId: kota.id, nama: namaKec } });
      kecCount++;

      for (const namaKel of kelList) {
        const kel = await prisma.kelurahan.upsert({ where: { kecamatanId_nama: { kecamatanId: kec.id, nama: namaKel } }, update: {}, create: { kecamatanId: kec.id, nama: namaKel } });
        kelCount++;

        // 5 RW per kelurahan, 5 RT per RW (production: 0 warga)
        for (let rn = 1; rn <= 5; rn++) {
          const rw = await prisma.rW.upsert({ where: { kelurahanId_nomor: { kelurahanId: kel.id, nomor: pad(rn) } }, update: {}, create: { kelurahanId: kel.id, nomor: pad(rn) } });
          rwCount++;
          for (let tn = 1; tn <= 5; tn++) {
            await prisma.rT.upsert({ where: { rwId_nomor: { rwId: rw.id, nomor: pad(tn) } }, update: {}, create: { rwId: rw.id, nomor: pad(tn), targetWarga: 10 } });
            rtCount++;
          }
        }
      }
    }
  }

  console.log(`✅ ${ktCount} kota | ${kecCount} kecamatan | ${kelCount} kelurahan | ${rwCount} RW | ${rtCount} RT`);

  // Hanya admin — tanpa pengguna operasional seed
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'GANTI_PASSWORD_INI', 12);
  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL ?? 'admin@jakdata.id' },
    update: { passwordHash: adminHash },
    create: { nama: 'Administrator JAKDATA', email: process.env.ADMIN_EMAIL ?? 'admin@jakdata.id', passwordHash: adminHash, role: 'admin_pusat' },
  });

  console.log(`✅ Admin user: ${process.env.ADMIN_EMAIL ?? 'admin@jakdata.id'}`);

  // Official Profile
  await prisma.publicOfficial.upsert({
    where: { id: 1 }, update: {},
    create: {
      namaLengkap: 'Sigit Purnomo Said', gelarBelakang: 'S.A.P.', officialPhotoUrl: '/official/sigit-purnomo-said.jpg',
      jabatan: 'Anggota DPR RI', lembaga: 'DPR RI', fraksi: 'Fraksi Partai Amanat Nasional', partai: 'Partai Amanat Nasional (PAN)',
      komisi: 'Komisi VIII DPR RI', dapil: 'DKI Jakarta III', periode: '2024–2029',
      fokusKomisi: ['Agama','Sosial','Haji','Bantuan Sosial','Kebencanaan','Perlindungan Anak','Lansia','Penyandang Disabilitas','Kelompok Rentan','Pemberdayaan Sosial'],
      bioSingkat: 'Anggota DPR RI Fraksi PAN Dapil DKI Jakarta III.',
      visi: 'Jakarta yang adil, sejahtera, dan berkeadilan sosial.',
      misi: ['Memperkuat bantuan sosial tepat sasaran', 'Pemberdayaan UMKM warga', 'Perlindungan kelompok rentan'],
    },
  }).catch(() => {});

  const [k, kec, kel, rw, rt] = await prisma.$transaction([
    prisma.kota.count(), prisma.kecamatan.count(), prisma.kelurahan.count(), prisma.rW.count(), prisma.rT.count(),
  ]);

  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   PRODUCTION SEED SELESAI             ║');
  console.log('╠═══════════════════════════════════════╣');
  console.log(`║ Kota/Kabupaten : ${String(k).padEnd(20)}║`);
  console.log(`║ Kecamatan      : ${String(kec).padEnd(20)}║`);
  console.log(`║ Kelurahan      : ${String(kel).padEnd(20)}║`);
  console.log(`║ RW             : ${String(rw).padEnd(20)}║`);
  console.log(`║ RT             : ${String(rt).padEnd(20)}║`);
  console.log('╠═══════════════════════════════════════╣');
  console.log('║ ⚠️  Ganti password admin di .env!      ║');
  console.log('╚═══════════════════════════════════════╝');
}

main().catch(console.error).finally(() => prisma.$disconnect());
