import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const pad = (n: number, l=3) => String(n).padStart(l,'0');

const JAKARTA: Record<string,{kode:string,tipe?:string,kecamatan:Record<string,string[]>}> = {
  'Jakarta Pusat':{kode:'JAKPUS',kecamatan:{'Gambir':['Gambir','Cideng','Petojo Selatan','Petojo Utara','Kebon Kelapa','Duri Pulo'],'Sawah Besar':['Pasar Baru','Kartini','Gunung Sahari Utara','Mangga Dua Selatan','Karang Anyar'],'Kemayoran':['Kemayoran','Kebon Kosong','Harapan Mulia','Cempaka Baru','Sumur Batu','Utan Panjang','Serdang','Rawasari'],'Senen':['Senen','Kramat','Kwitang','Kenari','Paseban','Bungur'],'Cempaka Putih':['Cempaka Putih Timur','Cempaka Putih Barat','Rawasari'],'Menteng':['Menteng','Pegangsaan','Cikini','Gondangdia','Kebon Sirih'],'Tanah Abang':['Tanah Abang','Kampung Bali','Karet','Karet Tengsin','Petamburan','Kebon Kacang','Kebon Melati','Gelora'],'Johar Baru':['Johar Baru','Kampung Rawa','Galur','Tanah Tinggi']}},
  'Jakarta Utara':{kode:'JAKUT',kecamatan:{'Penjaringan':['Penjaringan','Pluit','Kamal Muara','Kapuk Muara','Pejagalan'],'Pademangan':['Pademangan Barat','Pademangan Timur','Ancol'],'Tanjung Priok':['Tanjung Priok','Sunter Jaya','Sunter Agung','Papanggo','Sungai Bambu','Kebon Bawang'],'Koja':['Koja','Lagoa','Rawa Badak Selatan','Rawa Badak Utara','Tugu Selatan','Tugu Utara'],'Cilincing':['Cilincing','Semper Barat','Semper Timur','Rorotan','Marunda','Kalibaru','Sukapura'],'Kelapa Gading':['Kelapa Gading Barat','Kelapa Gading Timur','Pegangsaan Dua']}},
  'Jakarta Barat':{kode:'JAKBAR',kecamatan:{'Cengkareng':['Cengkareng Barat','Cengkareng Timur','Duri Kosambi','Kapuk','Kedaung Kali Angke','Rawa Buaya'],'Grogol Petamburan':['Grogol','Jelambar','Jelambar Baru','Tanjung Duren Selatan','Tanjung Duren Utara','Tomang','Wijaya Kusuma'],'Tambora':['Angke','Duri Selatan','Duri Utara','Jembatan Besi','Jembatan Lima','Kali Anyar','Krendang','Pekojan','Roa Malaka','Tambora','Tanah Sereal'],'Taman Sari':['Taman Sari','Glodok','Krukut','Mangga Besar','Maphar','Pinangsia','Tangki'],'Kebon Jeruk':['Duri Kepa','Kebon Jeruk','Kelapa Dua','Kedoya Selatan','Kedoya Utara','Sukabumi Selatan','Sukabumi Utara'],'Palmerah':['Palmerah','Slipi','Kota Bambu Utara','Kota Bambu Selatan','Jati Pulo','Kemanggisan'],'Kalideres':['Kalideres','Pegadungan','Semanan','Tegal Alur','Kamal'],'Kembangan':['Kembangan Utara','Kembangan Selatan','Joglo','Srengseng','Meruya Selatan','Meruya Utara']}},
  'Jakarta Selatan':{kode:'JAKSEL',kecamatan:{'Tebet':['Tebet Barat','Tebet Timur','Kebon Baru','Bukit Duri','Menteng Dalam','Manggarai','Manggarai Selatan'],'Setiabudi':['Setiabudi','Kuningan Timur','Karet','Karet Semanggi','Karet Kuningan','Guntur','Pasar Manggis','Menteng Atas'],'Mampang Prapatan':['Mampang Prapatan','Bangka','Pela Mampang','Tegal Parang','Kuningan Barat'],'Pasar Minggu':['Pasar Minggu','Kebagusan','Pejaten Barat','Pejaten Timur','Jati Padang','Cilandak Timur','Ragunan'],'Jagakarsa':['Jagakarsa','Srengseng Sawah','Ciganjur','Lenteng Agung','Tanjung Barat','Cipedak'],'Pesanggrahan':['Pesanggrahan','Bintaro','Ulujami','Petukangan Selatan','Petukangan Utara'],'Cilandak':['Cilandak Barat','Lebak Bulus','Gandaria Selatan','Cipete Selatan','Pondok Labu'],'Kebayoran Baru':['Senayan','Selong','Rawa Barat','Gandaria Utara','Cipete Utara','Pulo','Gunung','Kramat Pela','Petogogan','Melawai'],'Kebayoran Lama':['Kebayoran Lama Utara','Kebayoran Lama Selatan','Grogol Selatan','Grogol Utara','Cipulir','Pondok Pinang'],'Pancoran':['Pancoran','Kalibata','Rawajati','Duren Tiga','Pengadegan','Cikoko']}},
  'Jakarta Timur':{kode:'JAKTIM',kecamatan:{'Matraman':['Matraman','Palmeriam','Utan Kayu Selatan','Utan Kayu Utara','Pisangan Baru','Kebon Manggis'],'Pulogadung':['Pulogadung','Jatinegara Kaum','Pisangan Timur','Cipinang Cempedak','Cipinang Muara','Rawamangun','Kayu Putih'],'Jatinegara':['Kampung Melayu','Bidara Cina','Cipinang Besar Selatan','Cipinang Besar Utara','Cipinang','Rawa Bunga','Balimester'],'Kramat Jati':['Kramat Jati','Cililitan','Cawang','Dukuh','Batu Ampar','Balekambang','Tengah'],'Ciracas':['Ciracas','Susukan','Kelapa Dua Wetan','Cibubur','Rambutan'],'Cipayung':['Cipayung','Munjul','Pondok Rangon','Cilangkap','Setu','Bambu Apus','Lubang Buaya','Ceger'],'Cakung':['Cakung Timur','Cakung Barat','Pulo Gebang','Ujung Menteng','Penggilingan','Rawa Terate'],'Duren Sawit':['Duren Sawit','Pondok Bambu','Klender','Pondok Kelapa','Malaka Sari','Malaka Jaya','Pondok Kopi'],'Makasar':['Makasar','Cipinang Melayu','Halim Perdana Kusuma','Kebon Pala','Pinang Ranti'],'Pasar Rebo':['Pasar Rebo','Cijantung','Kalisari','Baru','Gedong']}},
  'Kepulauan Seribu':{kode:'KEPSER',tipe:'kabupaten',kecamatan:{'Kepulauan Seribu Utara':['Pulau Harapan','Pulau Kelapa','Pulau Panggang'],'Kepulauan Seribu Selatan':['Pulau Pari','Pulau Tidung','Pulau Untung Jawa']}},
};

async function main() {
  console.log('🌱 Seeding JAKDATA — Jakarta Lengkap...');

  const dki = await prisma.provinsi.upsert({where:{kode:'DKI'},update:{},create:{nama:'DKI Jakarta',kode:'DKI'}});

  let ktCount=0, kecCount=0, kelCount=0, rwCount=0, rtCount=0;
  const rtSample: number[] = [];
  const kelMap: Record<string,number> = {};

  for (const [namaKota, d] of Object.entries(JAKARTA)) {
    const kota = await prisma.kota.upsert({where:{kode:d.kode},update:{},create:{provinsiId:dki.id,nama:namaKota,kode:d.kode,tipe:d.tipe??'kota'}});
    ktCount++;
    for (const [namaKec, kelList] of Object.entries(d.kecamatan)) {
      const kec = await prisma.kecamatan.upsert({where:{kotaId_nama:{kotaId:kota.id,nama:namaKec}},update:{},create:{kotaId:kota.id,nama:namaKec}});
      kecCount++;
      for (const namaKel of kelList) {
        const kel = await prisma.kelurahan.upsert({where:{kecamatanId_nama:{kecamatanId:kec.id,nama:namaKel}},update:{},create:{kecamatanId:kec.id,nama:namaKel}});
        kelMap[`${namaKec}::${namaKel}`] = kel.id;
        kelCount++;
        for (let rn=1; rn<=5; rn++) {
          const rw = await prisma.rW.upsert({where:{kelurahanId_nomor:{kelurahanId:kel.id,nomor:pad(rn)}},update:{},create:{kelurahanId:kel.id,nomor:pad(rn)}});
          rwCount++;
          for (let tn=1; tn<=5; tn++) {
            const rt = await prisma.rT.upsert({where:{rwId_nomor:{rwId:rw.id,nomor:pad(tn)}},update:{},create:{rwId:rw.id,nomor:pad(tn),targetWarga:10}});
            rtCount++;
            if (rtSample.length < 15) rtSample.push(rt.id);
          }
        }
      }
    }
  }
  console.log(`✅ ${ktCount} kota | ${kecCount} kecamatan | ${kelCount} kelurahan | ${rwCount} RW | ${rtCount} RT`);

  // Users
  const h = (p:string) => bcrypt.hash(p, 10);
  const admin = await prisma.user.upsert({where:{email:'admin@jakdata.id'},update:{},create:{nama:'Administrator JAKDATA',email:'admin@jakdata.id',passwordHash:await h('admin123'),role:'admin_pusat'}});
  await prisma.user.upsert({where:{email:'petugas.rt001@jakdata.id'},update:{},create:{nama:'Petugas RT 001',email:'petugas.rt001@jakdata.id',passwordHash:await h('petugas123'),role:'petugas_lapangan',rtId:rtSample[0]}});
  await prisma.user.upsert({where:{email:'kordin.rw001@jakdata.id'},update:{},create:{nama:'Koordinator RW 001',email:'kordin.rw001@jakdata.id',passwordHash:await h('petugas123'),role:'koordinator_rw',rtId:rtSample[0]}});
  console.log('✅ Users');

  // Warga
  const namaCon=['Ahmad Fauzi','Siti Rahayu','Budi Santoso','Dewi Lestari','Hendra G','Rina Wulandari','Joko Susilo','Nur Hasanah','Agus P','Wahyu S','Bambang H','Fitri H','Rudi H','Yanti P','Doni S'];
  const katList=['warga_biasa','warga_biasa','penerima_bantuan','warga_biasa','pekerja_warmindo'];
  const stList=['sedang','rentan','miskin','sangat_miskin','mampu'] as const;
  let wCount=0;
  for (let i=0; i<Math.min(rtSample.length,10); i++) {
    const jml = i<5 ? 10+Math.floor(Math.random()*5) : Math.floor(Math.random()*8);
    for (let j=0; j<jml; j++) {
      await prisma.warga.create({data:{rtId:rtSample[i],nama:`${namaCon[j%namaCon.length]} ${i+1}`,noHp:`0812${String(i*100+j).padStart(8,'0')}`,jenisKelamin:j%2===0?'L':'P',kategori:katList[j%katList.length],statusEkonomi:stList[j%stList.length],pekerjaan:['Pedagang','Buruh','Ojek Online','IRT','Wiraswasta'][j%5],createdBy:admin.id}}).catch(()=>{});
      wCount++;
    }
  }
  console.log(`✅ ${wCount} warga sample`);

  // Keluarga
  for (let i=0; i<5; i++) {
    await prisma.keluarga.create({data:{rtId:rtSample[i],namaKepala:namaCon[i],noHpKepala:`0813${String(i).padStart(8,'0')}`,jumlahAnggota:3+i,jumlahTanggungan:1+i,statusEkonomi:stList[i%stList.length],totalPenghasilan:[0,800000,1500000,3000000,5000000][i],skorPrioritasBantuan:[95,80,55,30,15][i],kategoriBantuan:['sangat_prioritas','prioritas','normal','normal','tidak_prioritas'][i]}}).catch(()=>{});
  }
  console.log('✅ Keluarga/KK');

  // Laporan
  const lap=[
    {kode:'JAK-2026-00001',ch:'whatsapp',nama:'Ibu Sari',hp:'081234567890',isi:'Rumah kebanjiran, anak-anak belum makan.',kat:'bencana',sub:'banjir',urg:'critical' as const,em:true,sum:'Banjir + keluarga tanpa makan.',rek:'Kirim evakuasi dan makanan darurat.'},
    {kode:'JAK-2026-00002',ch:'web',nama:'Pak Hendra',hp:'081298765432',isi:'Anak 12 tahun putus sekolah karena biaya.',kat:'pendidikan',sub:'anak_putus_sekolah',urg:'high' as const,em:false,sum:'Anak putus sekolah karena ekonomi.',rek:'Koordinasi Dinas Pendidikan.'},
    {kode:'JAK-2026-00003',ch:'whatsapp',nama:'Bu Wati',hp:'081387654321',isi:'Ibu lansia 78 tahun 2 hari tidak makan.',kat:'sosial',sub:'lansia_terlantar',urg:'high' as const,em:false,sum:'Lansia 78 tahun tanpa makanan.',rek:'Kunjungi segera.'},
    {kode:'JAK-2026-00004',ch:'web',nama:'Pak Doni',hp:'081376543210',isi:'Anak jalanan 8-10 tahun tidak sekolah.',kat:'sosial',sub:'anak_jalanan',urg:'medium' as const,em:false,sum:'Anak jalanan tanpa tempat tinggal.',rek:'Koordinasi Dinas Sosial.'},
    {kode:'JAK-2026-00005',ch:'koordinator',nama:'Koordinator RT',hp:'081222220002',isi:'Warga kehilangan pekerjaan 3 bulan, 4 anak.',kat:'ekonomi',sub:'kehilangan_pekerjaan',urg:'medium' as const,em:false,sum:'Kepala keluarga 3 bulan menganggur.',rek:'Program pelatihan kerja.'},
    {kode:'JAK-2026-00006',ch:'whatsapp',nama:'Bu Nurul',hp:'081365432109',isi:'Bantuan sembako belum terima padahal terdaftar.',kat:'bantuan',sub:'bantuan_belum_terima',urg:'medium' as const,em:false,sum:'Warga terdaftar belum terima bantuan.',rek:'Distribusi susulan.'},
    {kode:'JAK-2026-00007',ch:'web',nama:'Pak Sugeng',hp:'081354321098',isi:'Ibu hamil 8 bulan lemah, tidak ada biaya dokter.',kat:'kesehatan',sub:'ibu_hamil_berisiko',urg:'high' as const,em:false,sum:'Ibu hamil lemah tanpa biaya.',rek:'Rujuk puskesmas, daftarkan JKN.'},
    {kode:'JAK-2026-00008',ch:'web',nama:'Pak Rahmat',hp:'081312345678',isi:'Atap rumah rubuh kena angin kencang.',kat:'bencana',sub:'rumah_rusak',urg:'high' as const,em:false,sum:'Atap rubuh akibat angin.',rek:'Koordinasi BPBD.'},
  ];
  for (const l of lap) {
    await prisma.laporanWarga.upsert({where:{kodeLaporan:l.kode},update:{},create:{kodeLaporan:l.kode,channelType:l.ch,namaPelapor:l.nama,noHpPelapor:l.hp,isiLaporan:l.isi,kategori:l.kat,subkategori:l.sub,urgencyLevel:l.urg,isEmergency:l.em,rtId:rtSample[0],aiSummary:l.sum,aiRecommendation:l.rek,createdBy:admin.id}});
  }
  console.log(`✅ ${lap.length} laporan warga`);

  // Bantuan
  const sem = await prisma.bantuan.create({data:{nama:'Sembako Paket A',tipe:'sembako',deskripsi:'Beras 5kg, minyak 1L, gula 1kg, mie 5 bungkus',satuan:'paket',nilaiPerSatuan:150000,stokTotal:200,stokTersisa:127,sumber:'JAKDATA Program',tanggalMasuk:new Date()}}).catch(()=>null);
  await prisma.bantuan.create({data:{nama:'Bantuan Tunai Darurat',tipe:'uang_tunai',deskripsi:'Tunai untuk keluarga terdampak',satuan:'orang',nilaiPerSatuan:500000,stokTotal:50,stokTersisa:38,sumber:'Dana Sosial',tanggalMasuk:new Date()}}).catch(()=>null);
  await prisma.bantuan.create({data:{nama:'Perlengkapan Sekolah',tipe:'sembako',deskripsi:'Seragam, tas, alat tulis',satuan:'paket',nilaiPerSatuan:350000,stokTotal:30,stokTersisa:24,sumber:'Donasi',tanggalMasuk:new Date()}}).catch(()=>null);
  if (sem) {
    for (const p of [{n:'Warga Prioritas 1',s:'diterima'},{n:'Warga Prioritas 2',s:'diterima'},{n:'Warga Prioritas 3',s:'terjadwal'},{n:'Warga Prioritas 4',s:'terjadwal'}]) {
      await prisma.bantuanPenerima.create({data:{bantuanId:sem.id,namaPenerima:p.n,rtId:rtSample[0],jumlahDiterima:1,status:p.s as any,tanggalDiterima:p.s==='diterima'?new Date():undefined}}).catch(()=>{});
    }
  }
  console.log('✅ Bantuan dan penerima');

  // Warmindo
  const kapukId = kelMap['Cengkareng::Kapuk'] ?? Object.values(kelMap)[3];
  const w1 = await prisma.warmindoOutlet.upsert({where:{kodeOutlet:'WRM-001'},update:{},create:{kodeOutlet:'WRM-001',namaOutlet:'Warmindo Kapuk 1',kelurahanId:kapukId,rtId:rtSample[0],alamat:'Jl. Kapuk Raya No. 12',status:'aktif',modalAwal:20000000,targetOmzetHarian:1000000,targetLabaBulanan:3000000,biayaSewaBulanan:1500000,karyawanTotal:3,tanggalBuka:new Date(Date.now()-60*24*3600000)}});
  const angkeId = kelMap['Tambora::Angke'] ?? Object.values(kelMap)[15];
  await prisma.warmindoOutlet.upsert({where:{kodeOutlet:'WRM-002'},update:{},create:{kodeOutlet:'WRM-002',namaOutlet:'Warmindo Tambora 1',kelurahanId:angkeId,rtId:rtSample[5],alamat:'Jl. Angke No. 7',status:'persiapan',modalAwal:20000000,targetOmzetHarian:800000,targetLabaBulanan:2500000,biayaSewaBulanan:1200000,karyawanTotal:2}});

  for (const it of [{n:'Mie Instan (Karton)',s:'karton',st:25,m:5,b:95000,j:3500},{n:'Telur Ayam',s:'kg',st:12,m:3,b:25000,j:2800},{n:'Beras',s:'kg',st:30,m:10,b:12000,j:0},{n:'Minyak Goreng',s:'liter',st:8,m:2,b:15000,j:0},{n:'Air Mineral (Dus)',s:'dus',st:6,m:5,b:18000,j:3000},{n:'Gas LPG 3kg',s:'tabung',st:4,m:2,b:20000,j:0}]) {
    await prisma.warmindoInventory.upsert({where:{warmindoId_namaBahan:{warmindoId:w1.id,namaBahan:it.n}},update:{},create:{warmindoId:w1.id,namaBahan:it.n,satuan:it.s,stokSaatIni:it.st,stokMinimum:it.m,hargaBeli:it.b,hargaJual:it.j}});
  }
  const om=[875000,920000,750000,1050000,980000,1100000,890000,960000,1020000,870000,940000,1080000,920000,1010000];
  for (let i=0; i<om.length; i++) { const t=new Date(); t.setDate(t.getDate()-i); await prisma.warmindoTransaksi.create({data:{warmindoId:w1.id,tanggal:t,totalOmzet:om[i],totalHpp:Math.round(om[i]*.65),grossProfit:Math.round(om[i]*.35),jumlahItem:Math.floor(om[i]/15000),items:[{nama:'Mie Goreng',qty:30,harga:15000}]}}); }
  for (const p of [{k:'gaji_karyawan',d:'Gaji kasir',j:1500000},{k:'sewa_tempat',d:'Sewa tempat',j:1500000},{k:'listrik',d:'Listrik + gas',j:450000},{k:'bahan_baku',d:'Mie 10 karton',j:950000},{k:'bahan_baku',d:'Telur 20kg',j:500000}]) {
    await prisma.warmindoPengeluaran.create({data:{warmindoId:w1.id,kategori:p.k,deskripsi:p.d,jumlah:p.j}});
  }
  console.log('✅ Warmindo + 14 hari transaksi');

  // Official Profile
  await prisma.publicOfficial.upsert({where:{id:1},update:{},create:{namaLengkap:'Sigit Purnomo Said',gelarBelakang:'S.A.P.',officialPhotoUrl:null,jabatan:'Anggota DPR RI',lembaga:'DPR RI',fraksi:'Fraksi Partai Amanat Nasional',partai:'Partai Amanat Nasional (PAN)',komisi:'Komisi VIII DPR RI',dapil:'DKI Jakarta II',periode:'2024–2029',fokusKomisi:['Agama','Sosial','Haji','Bantuan Sosial','Kebencanaan','Perlindungan Anak','Lansia','Penyandang Disabilitas','Kelompok Rentan','Pemberdayaan Sosial'],waAspirasi:'6281234567890',instagram:'@sigitpurnomosaid',bioSingkat:'Anggota DPR RI Fraksi PAN Dapil DKI Jakarta II, berkomitmen memperjuangkan kesejahteraan warga Jakarta.',visi:'Jakarta yang adil, sejahtera, dan berkeadilan sosial untuk seluruh warga.',misi:['Memperkuat program bantuan sosial tepat sasaran','Mendorong pemberdayaan ekonomi warga melalui UMKM dan Warmindo','Memastikan perlindungan anak, lansia, dan penyandang disabilitas','Mengawal pengelolaan dana haji yang transparan','Memperjuangkan infrastruktur sosial di Jakarta']}}).catch(()=>{});
  console.log('✅ Profil Sigit Purnomo Said, S.A.P. — Anggota DPR RI');

  const [k,kec,kel,rw,rt,w] = await prisma.$transaction([prisma.kota.count(),prisma.kecamatan.count(),prisma.kelurahan.count(),prisma.rW.count(),prisma.rT.count(),prisma.warga.count()]);
  console.log(`\n╔════════════════════════════╗`);
  console.log(`║   SEED JAKDATA SELESAI     ║`);
  console.log(`╠════════════════════════════╣`);
  console.log(`║ Kota/Kab  : ${String(k).padEnd(15)}║`);
  console.log(`║ Kecamatan : ${String(kec).padEnd(15)}║`);
  console.log(`║ Kelurahan : ${String(kel).padEnd(15)}║`);
  console.log(`║ RW        : ${String(rw).padEnd(15)}║`);
  console.log(`║ RT        : ${String(rt).padEnd(15)}║`);
  console.log(`║ Warga     : ${String(w).padEnd(15)}║`);
  console.log(`╠════════════════════════════╣`);
  console.log(`║ admin@jakdata.id/admin123  ║`);
  console.log(`╚════════════════════════════╝`);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
