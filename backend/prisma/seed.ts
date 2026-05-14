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
  const kec0 = await prisma.kecamatan.findFirst({ where: { nama: 'Cengkareng' } });
  const kel0 = kec0 ? await prisma.kelurahan.findFirst({ where: { kecamatanId: kec0.id, nama: 'Kapuk' } }) : null;
  await prisma.user.upsert({where:{email:'petugas.rt001@jakdata.id'},update:{},create:{nama:'Petugas RT 001',email:'petugas.rt001@jakdata.id',passwordHash:await h('petugas123'),role:'petugas_lapangan',rtId:rtSample[0]}});
  await prisma.user.upsert({where:{email:'kordin.rw001@jakdata.id'},update:{},create:{nama:'Koordinator RW 001',email:'kordin.rw001@jakdata.id',passwordHash:await h('petugas123'),role:'koordinator_rw',rwId: (await prisma.rT.findUnique({ where: { id: rtSample[0] } }))?.rwId }});
  await prisma.user.upsert({where:{email:'kordin.rt001@jakdata.id'},update:{},create:{nama:'Koordinator RT 001',email:'kordin.rt001@jakdata.id',passwordHash:await h('petugas123'),role:'koordinator_rt',rtId: rtSample[0]}});
  await prisma.user.upsert({where:{email:'kordin.kel@jakdata.id'},update:{},create:{nama:'Koordinator Kelurahan',email:'kordin.kel@jakdata.id',passwordHash:await h('petugas123'),role:'koordinator_kelurahan',kelurahanId: kel0?.id ?? undefined}});
  await prisma.user.upsert({where:{email:'kordin.kec@jakdata.id'},update:{},create:{nama:'Koordinator Kecamatan',email:'kordin.kec@jakdata.id',passwordHash:await h('petugas123'),role:'koordinator_kecamatan',kecamatanId: kec0?.id ?? undefined}});
  await prisma.user.upsert({where:{email:'auditor@jakdata.id'},update:{},create:{nama:'Auditor',email:'auditor@jakdata.id',passwordHash:await h('auditor123'),role:'auditor'}});
  await prisma.user.upsert({where:{email:'finance@jakdata.id'},update:{},create:{nama:'Finance Admin',email:'finance@jakdata.id',passwordHash:await h('finance123'),role:'finance_admin'}});
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
    await prisma.keluarga.create({data:{rtId:rtSample[i],namaKepala:namaCon[i],noHpKepala:`0813${String(i).padStart(8,'0')}`,jumlahAnggota:3+i,jumlahTanggungan:1+i,statusEkonomi:stList[i%stList.length],totalPenghasilan:[0,800000,1500000,3000000,5000000][i],skorPrioritasBantuan:[95,80,55,30,15][i],kategoriBAntuan:['sangat_prioritas','prioritas','normal','normal','tidak_prioritas'][i]}}).catch(()=>{});
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

  const rt0 = await prisma.rT.findUnique({ where: { id: rtSample[0] }, include: { rw: true } });
  const mgrUser = await prisma.user.upsert({
    where: { email: 'manager.wrm001@jakdata.id' },
    update: { warmindoId: w1.id },
    create: { nama: 'Manager Warmindo Kapuk', email: 'manager.wrm001@jakdata.id', passwordHash: await h('warmindo123'), role: 'manager_warmindo', warmindoId: w1.id, rtId: rtSample[0] },
  });
  const ksrUser = await prisma.user.upsert({
    where: { email: 'kasir.wrm001@jakdata.id' },
    update: { warmindoId: w1.id },
    create: { nama: 'Kasir Warmindo Kapuk', email: 'kasir.wrm001@jakdata.id', passwordHash: await h('warmindo123'), role: 'kasir_warmindo', warmindoId: w1.id, rtId: rtSample[0] },
  });
  await prisma.warmindoOutlet.update({
    where: { id: w1.id },
    data: {
      managerUserId: mgrUser.id,
      rwId: rt0?.rwId ?? undefined,
      jamBuka: '06:00',
      jamTutup: '23:00',
      tipeLokasi: 'permukiman',
      kelasOutlet: 'sedang',
      kapasitasDuduk: 18,
      pemilikNama: 'Bapak Subur',
      pemilikKontak: '081200011122',
    },
  });

  if (!(await prisma.warmindoSupplier.findFirst({ where: { warmindoId: w1.id, nama: 'Grosir Makmur Kapuk' } }))) {
  const sup = await prisma.warmindoSupplier.create({
    data: { warmindoId: w1.id, nama: 'Grosir Makmur Kapuk', telepon: '0215550102', alamat: 'Jl. Kapuk Kamal', rating: 4.2 },
  });
  const pMie = await prisma.warmindoProduct.create({
    data: { warmindoId: w1.id, supplierId: sup.id, sku: 'SKU-MIE-01', nama: 'Mie Goreng Instan', kategori: 'instan', brand: 'Sedaap', hargaModal: 2500, hargaJual: 4500, marginPct: 44, satuan: 'pcs', consumptionTag: 'instan', aktif: true },
  });
  const pKopi = await prisma.warmindoProduct.create({
    data: { warmindoId: w1.id, nama: 'Kopi Sachet', kategori: 'minuman', brand: 'Good Day', hargaModal: 1200, hargaJual: 2500, marginPct: 52, satuan: 'pcs', consumptionTag: 'lainnya', aktif: true },
  });
  const pTelur = await prisma.warmindoProduct.create({
    data: { warmindoId: w1.id, supplierId: sup.id, nama: 'Telur Ayam Konsumen', kategori: 'protein', hargaModal: 2200, hargaJual: 3000, marginPct: 27, satuan: 'butir', consumptionTag: 'protein', aktif: true },
  });
  const pAir = await prisma.warmindoProduct.create({
    data: { warmindoId: w1.id, nama: 'Air Mineral 600ml', kategori: 'air', hargaModal: 2000, hargaJual: 3500, marginPct: 43, satuan: 'botol', consumptionTag: 'air_mineral', aktif: true },
  });
  await prisma.warmindoStockMovement.createMany({
    data: [
      { warmindoId: w1.id, productId: pMie.id, movementType: 'masuk', qty: 200, reason: 'Belanja grosir', occurredAt: new Date(Date.now() - 86400000 * 3) },
      { warmindoId: w1.id, productId: pMie.id, movementType: 'keluar', qty: 40, reason: 'Penjualan', occurredAt: new Date(Date.now() - 86400000 * 2) },
    ],
  });

  const empKasir = await prisma.warmindoEmployee.create({
    data: { warmindoId: w1.id, userId: ksrUser.id, nama: ksrUser.nama, role: 'kasir', statusAktif: true, tanggalMulai: new Date(Date.now() - 90 * 86400000), gajiPokok: 3200000, sistemUpah: 'bulanan', kontak: '081211122233' },
  });
  const empOps = await prisma.warmindoEmployee.create({
    data: { warmindoId: w1.id, nama: 'Agus Helper', role: 'ops', statusAktif: true, tanggalMulai: new Date(Date.now() - 60 * 86400000), gajiPokok: 2800000, sistemUpah: 'bulanan' },
  });
  const shift1 = await prisma.warmindoShift.create({
    data: {
      warmindoId: w1.id,
      employeeId: empKasir.id,
      shiftType: 'pagi',
      status: 'selesai',
      plannedStart: new Date(new Date().setHours(6, 0, 0, 0)),
      plannedEnd: new Date(new Date().setHours(14, 0, 0, 0)),
      actualStart: new Date(new Date().setHours(6, 10, 0, 0)),
      actualEnd: new Date(new Date().setHours(14, 5, 0, 0)),
      supervisorUserId: mgrUser.id,
    },
  });
  await prisma.warmindoAttendance.create({
    data: { warmindoId: w1.id, employeeId: empKasir.id, shiftId: shift1.id, checkInAt: new Date(new Date().setHours(6, 12, 0, 0)), checkOutAt: new Date(new Date().setHours(14, 2, 0, 0)), lateMinutes: 12, status: 'hadir', overtimeMinutes: 0, gpsInLat: -6.12, gpsInLng: 106.74 },
  });

  const mkSale = async (hour: number, pm: 'cash' | 'qris', total: number, lines: { pid: number; q: number; up: number; uc: number }[]) => {
    const sub = lines.reduce((s, l) => s + l.q * l.up, 0);
    const cost = lines.reduce((s, l) => s + l.q * l.uc, 0);
    const oc = new Date();
    oc.setHours(hour, 15 + Math.floor(Math.random() * 40), 0, 0);
    const sale = await prisma.warmindoSale.create({
      data: {
        warmindoId: w1.id,
        occurredAt: oc,
        paymentMethod: pm,
        subtotal: sub,
        discountTotal: 0,
        totalAmount: total,
        totalCost: cost,
        grossMargin: total - cost,
        cashierEmployeeId: empKasir.id,
        shiftId: shift1.id,
        weatherCode: hour < 12 ? 'hujan_ringan' : 'cerah',
        buyerRtId: rtSample[0],
      },
    });
    for (const l of lines) {
      const lt = l.q * l.up;
      await prisma.warmindoSaleLine.create({
        data: { saleId: sale.id, productId: l.pid, qty: l.q, unitPrice: l.up, unitCost: l.uc, lineTotal: lt, lineMargin: lt - l.q * l.uc },
      });
    }
    await prisma.warmindoFinanceLedgerEntry.create({
      data: { warmindoId: w1.id, occurredAt: oc, direction: 'masuk', amount: total, balanceAfter: null, paymentMethod: pm, referenceType: 'warmindo_sale', referenceId: sale.id, notes: 'Penjualan' },
    });
  };
  await mkSale(7, 'qris', 67500, [{ pid: pMie.id, q: 10, up: 4500, uc: 2500 }, { pid: pKopi.id, q: 5, up: 2500, uc: 1200 }]);
  await mkSale(8, 'cash', 42000, [{ pid: pTelur.id, q: 10, up: 3000, uc: 2200 }, { pid: pAir.id, q: 3, up: 3500, uc: 2000 }]);
  await mkSale(22, 'cash', 55000, [{ pid: pMie.id, q: 12, up: 4500, uc: 2500 }]);

  const closeDay = new Date();
  closeDay.setHours(0, 0, 0, 0);
  await prisma.warmindoDailyClosing.create({
    data: {
      warmindoId: w1.id,
      closingDate: closeDay,
      totalPenjualan: 164500,
      totalPengeluaran: 420000,
      grossProfit: 64000,
      netProfit: -356000,
      cashExpected: 97000,
      cashActual: 95500,
      cashDiscrepancy: -1500,
      missingStockNote: '2 bungkus mie tidak cocok fisik',
      managerNote: 'Hujan pagi, omzet mie naik',
      verifiedByUserId: (await prisma.user.findUnique({ where: { email: 'finance@jakdata.id' } }))?.id ?? admin.id,
      verifiedAt: new Date(),
    },
  }).catch(() => {});

  const po = await prisma.warmindoPurchaseOrder.create({
    data: { warmindoId: w1.id, supplierId: sup.id, status: 'diterima', orderedAt: new Date(Date.now() - 5 * 86400000), expectedAt: new Date(Date.now() - 4 * 86400000), receivedAt: new Date(Date.now() - 4 * 86400000) },
  });
  await prisma.warmindoPurchaseOrderLine.create({ data: { poId: po.id, productId: pMie.id, deskripsi: 'Mie goreng dus', qtyOrdered: 100, qtyReceived: 100, unitCost: 2500 } });
  await prisma.warmindoSupplierPayment.create({ data: { warmindoId: w1.id, supplierId: sup.id, amount: 250000, method: 'transfer', reference: 'TRF-2026-001' } });

  const asset = await prisma.warmindoAsset.create({
    data: { warmindoId: w1.id, nama: 'Freezer Showcase', kategori: 'freezer', tanggalBeli: new Date(Date.now() - 400 * 86400000), hargaBeli: 4500000, kondisi: 'cukup', lokasi: 'Belakang kasir', opStatus: 'aktif', umurEkonomisBulan: 48 },
  });
  await prisma.warmindoAssetMaintenance.create({ data: { assetId: asset.id, masalah: 'Freon rendah', biaya: 350000, vendor: 'Service Dingin', tanggal: new Date(Date.now() - 20 * 86400000), status: 'selesai', catatan: 'Sudah diisi ulang' } });

  await prisma.warmindoSupplyChainEvent.create({
    data: { warmindoId: w1.id, supplierId: sup.id, productId: pTelur.id, territoryLevel: 'rt', territoryId: rtSample[0], kind: 'kenaikan_harga', severity: 2.5, occurredAt: new Date(Date.now() - 10 * 86400000), notes: 'Harga telur naik 8% dari supplier' },
  });

  const pr = await prisma.warmindoPayrollRun.create({
    data: { warmindoId: w1.id, periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1), periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), status: 'dibayar', paidAt: new Date() },
  });
  await prisma.warmindoPayrollLine.createMany({
    data: [
      { payrollRunId: pr.id, employeeId: empKasir.id, workDays: 26, workHours: 208, overtimeHours: 4, potongan: 0, bonus: 200000, gajiBersih: 3400000 },
      { payrollRunId: pr.id, employeeId: empOps.id, workDays: 26, workHours: 208, overtimeHours: 0, potongan: 50000, bonus: 0, gajiBersih: 2750000 },
    ],
  });
  await prisma.warmindoWorkforcePerformanceSnapshot.create({
    data: {
      warmindoId: w1.id,
      employeeId: empKasir.id,
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodEnd: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
      lateCount: 3,
      absenceCount: 0,
      overtimeHours: 6,
      transactionsHandled: 420,
      cashErrorCount: 1,
      productivityScore: 0.82,
      fatigueScore: 0.35,
      reliabilityScore: 0.9,
    },
  });

  }

  const kks = await prisma.keluarga.findMany({ take: 5, orderBy: { id: 'asc' } });
  let prog1 = await prisma.aidProgram.findFirst({ where: { nama: 'Bantuan Pangan Stunting 2026' } });
  if (!prog1) {
    prog1 = await prisma.aidProgram.create({
      data: {
        nama: 'Bantuan Pangan Stunting 2026',
        sumber: 'pemerintah',
        periodeMulai: new Date(new Date().getFullYear(), 0, 1),
        periodeSelesai: new Date(new Date().getFullYear(), 11, 31),
        wilayahTargetLevel: 'rt',
        wilayahTargetId: rtSample[0],
        kategoriBantuan: 'pangan',
        kuota: 500,
        kriteriaPenerima: 'KK risiko stunting & sangat_prioritas',
      },
    });
  }
  let prog2 = await prisma.aidProgram.findFirst({ where: { nama: 'Reses DPR — Sembako' } });
  if (!prog2) {
    prog2 = await prisma.aidProgram.create({
      data: { nama: 'Reses DPR — Sembako', sumber: 'reses', periodeMulai: new Date(), periodeSelesai: new Date(Date.now() + 90 * 86400000), kategoriBantuan: 'sembako', kuota: 120 },
    });
  }
  if (kks.length > 0 && (await prisma.aidRecipientHistory.count({ where: { programId: prog1.id } })) < 1) {
  for (let i = 0; i < 4; i++) {
    const kk = kks[i % kks.length];
    await prisma.aidRecipientHistory.create({
      data: {
        programId: prog1.id,
        keluargaId: kk.id,
        jenisBantuan: 'paket_pangan',
        nilaiBantuan: 200000 + i * 10000,
        verifikasi: 'terverifikasi',
        petugasUserId: admin.id,
        lokasi: 'Posko RT',
      },
    });
  }
  await prisma.aidRecipientHistory.create({
    data: { programId: prog2.id, keluargaId: kks[0].id, jenisBantuan: 'sembako', nilaiBantuan: 175000, verifikasi: 'terverifikasi' },
  });
  await prisma.aidRecipientHistory.create({
    data: { programId: prog2.id, keluargaId: kks[0].id, jenisBantuan: 'sembako', nilaiBantuan: 175000, verifikasi: 'menunggu', catatan: 'Penerima berulang lintas program' },
  });
  for (const kk of kks) {
    await prisma.aidEligibilityScore.create({
      data: {
        keluargaId: kk.id,
        povertyScore: 0.4 + Math.random() * 0.4,
        disasterRiskScore: 0.2,
        healthRiskScore: 0.25,
        elderlyScore: 0.1,
        childrenScore: 0.35,
        unemploymentScore: 0.3,
        previousAidPenalty: kk.id === kks[0].id ? 0.6 : 0.1,
        finalPriorityScore: kk.id === kks[0].id ? 0.35 : 0.72,
      },
    });
  }
  await prisma.aidFairnessAudit.create({
    data: {
      wilayahLevel: 'rt',
      wilayahId: rtSample[0],
      periodeMulai: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodeSelesai: new Date(),
      jumlahPenerima: 42,
      penerimaBerulang: 14,
      belumPernahTerbantu: 38,
      coverageRatio: 0.52,
      fairnessScore: 0.58,
      anomalyNote: 'Konsentrasi bantuan pada KK yang sama 4x dalam 6 bulan',
    },
  });
  }

  if ((await prisma.territorialEconomicSnapshot.count({ where: { territoryLevel: 'rt', territoryId: rtSample[0] } })) < 1) {
  const day0 = new Date();
  day0.setUTCHours(0, 0, 0, 0);
  await prisma.territorialEconomicSnapshot.create({
    data: {
      territoryLevel: 'rt',
      territoryId: rtSample[0],
      bucketKind: 'day',
      bucketStart: day0,
      txnCount: 48,
      revenueTotal: 164500,
      avgBasket: 18500,
      buyerEstimate: 32,
      dominantProductName: 'Mie Instan',
      dominantCategory: 'instan',
      cashShare: 0.45,
      qrisShare: 0.42,
      transferShare: 0.13,
      economicStress: 0.62,
      instantConsumptionShare: 0.41,
      proteinConsumptionShare: 0.12,
      tobaccoShare: 0.08,
      waterShare: 0.11,
    },
  });
  await prisma.territorialSocialSnapshot.create({
    data: {
      territoryLevel: 'rt',
      territoryId: rtSample[0],
      bucketKind: 'month',
      bucketStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      jumlahKk: 45,
      jumlahWarga: 178,
      anak: 52,
      lansia: 18,
      ibuHamil: 3,
      disabilitas: 4,
      produktif: 95,
      pengangguran: 12,
      informalWorkers: 28,
      industriWorkers: 8,
      pelajar: 35,
      stuntingEstimate: 0.09,
      crimeRisk: 0.22,
      floodRisk: 0.55,
      foodInsecurityRisk: 0.38,
    },
  });
  await prisma.territorialFoodSecuritySnapshot.create({
    data: {
      territoryLevel: 'rt',
      territoryId: rtSample[0],
      bucketKind: 'week',
      bucketStart: day0,
      foodAccessScore: 0.61,
      avgFoodPriceIndex: 1.08,
      stockAvailability: 0.74,
      proteinShare: 0.12,
      instantShare: 0.39,
      affordabilityIndex: 0.55,
      hungerSignal: 0.28,
    },
  });
  await prisma.territorialFairnessSnapshot.create({
    data: {
      territoryLevel: 'rt',
      territoryId: rtSample[0],
      bucketKind: 'month',
      bucketStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      totalAidValue: 9200000,
      uniqueFamilies: 28,
      repeatShare: 0.34,
      untouchedHighRisk: 19,
      fairnessRatio: 0.57,
      eliteCaptureRisk: 0.41,
      politicalConcRisk: 0.22,
    },
  });
  await prisma.territorialHealthScore.create({
    data: {
      territoryLevel: 'rt',
      territoryId: rtSample[0],
      bucketStart: day0,
      healthScore: 0.58,
      economicScore: 0.52,
      socialScore: 0.61,
      securityScore: 0.64,
      healthDomain: 0.55,
      foodScore: 0.5,
      aidScore: 0.57,
      governanceScore: 0.49,
      civicScore: 0.6,
    },
  });
  await prisma.territorialGovernanceSnapshot.create({
    data: {
      territoryLevel: 'rt',
      territoryId: rtSample[0],
      bucketStart: day0,
      laporanMasuk: 12,
      laporanSelesai: 7,
      avgResponseHours: 18.5,
      bantuanDiusulkan: 5,
      validasiData: 14,
      wilayahRawan: 2,
      aktivitasPejabat: 3,
    },
  });
  await prisma.territorialHumanActivitySnapshot.create({
    data: {
      territoryLevel: 'rt',
      territoryId: rtSample[0],
      bucketKind: 'day',
      bucketStart: day0,
      peakHour: 7,
      nightActivityRatio: 0.31,
      reportCount: 4,
      txnCount: 48,
      aidEvents: 2,
      publicEvents: 1,
      stressIndex: 0.44,
    },
  });
  await prisma.civicParticipationSnapshot.create({
    data: {
      territoryLevel: 'rt',
      territoryId: rtSample[0],
      bucketStart: day0,
      laporanPerKapita: 0.07,
      kegiatanCount: 3,
      gotongRoyong: 2,
      bantuanPartisipasi: 6,
      validasiPartisipasi: 4,
      trustProxy: 0.63,
    },
  });

  const lapBanjir = await prisma.laporanWarga.findUnique({ where: { kodeLaporan: 'JAK-2026-00001' } });
  if (lapBanjir) {
    await prisma.governmentResponseTracking.upsert({
      where: { laporanId: lapBanjir.id },
      update: {},
      create: {
        laporanId: lapBanjir.id,
        firstAckAt: new Date(Date.now() - 3 * 3600000),
        firstActionAt: new Date(Date.now() - 2 * 3600000),
        responderUnit: 'RT + BPBD',
        responderUserId: admin.id,
        slaTargetHours: 6,
        tindakanRingkas: 'Evakuasi parsial + posko',
        hasilRingkas: 'Warga terlayani makanan darurat',
      },
    });
  }

  await prisma.territorialTimelineEntry.create({
    data: { territoryLevel: 'rt', territoryId: rtSample[0], eventKind: 'bencana', judul: 'Banjir setinggi lutut', ringkasan: 'Genangan 6 jam', sourceType: 'laporan_warga', sourceId: lapBanjir?.id ?? 1, importance: 5 },
  });
  await prisma.territorialChangeEvent.create({
    data: {
      territoryLevel: 'rt',
      territoryId: rtSample[0],
      metricKey: 'txn_count_daily',
      windowStart: new Date(Date.now() - 14 * 86400000),
      windowEnd: day0,
      beforeValue: 62,
      afterValue: 48,
      deltaPct: -22.6,
      severity: 'sedang',
      confidence: 0.72,
      causeHint: 'Banjir + penurunan daya beli',
    },
  });
  await prisma.territorialStressSignal.create({
    data: { territoryLevel: 'rt', territoryId: rtSample[0], signalKind: 'laporan_naik', magnitude: 2.1, explanation: 'Lonjakan laporan bencana & bantuan', sourceRef: 'laporan:7d' },
  });
  const dis = await prisma.territorialDisasterEvent.create({
    data: { disasterType: 'banjir', territoryLevel: 'rt', territoryId: rtSample[0], startedAt: new Date(Date.now() - 2 * 86400000), severityNote: 'Genangan 40cm, 120 KK' },
  });
  await prisma.disasterImpactTracking.createMany({
    data: [
      { disasterEventId: dis.id, impactDomain: 'ekonomi', metricKey: 'warmindo_txn_drop', metricValue: 0.18, observedAt: new Date() },
      { disasterEventId: dis.id, impactDomain: 'pangan', metricKey: 'instant_share_up', metricValue: 0.09, observedAt: new Date() },
    ],
  });

  const obs = await prisma.aIObservation.create({
    data: {
      territoryLevel: 'rt',
      territoryId: rtSample[0],
      laporanId: lapBanjir?.id,
      body: 'Lonjakan kebutuhan pangan siap saji dan air kemasan pasca genangan.',
      polaRingkas: 'Mie + air mineral naik sore',
      risikoRingkas: 'Rawan undernutrisi anak jika >72 jam',
      buktiData: 'sales_lines+laporan',
      confidence: 0.74,
    },
  });
  const hyp = await prisma.aIHypothesis.create({
    data: {
      observationId: obs.id,
      dugaanMasalah: 'Tekanan pangan akut pada KK anak',
      alasan: 'Korelasi banjir + pola keranjang belanja',
      dataPendukung: 'FoodSecuritySnapshot.hungerSignal naik',
      dataKurang: 'Survei asupan detail',
      perluInvestigasi: true,
      confidence: 0.66,
    },
  });
  const rec = await prisma.aIRecommendation.create({
    data: {
      hypothesisId: hyp.id,
      rekomendasi: 'Aktifkan posko pangan anak + distribusi air 48 jam',
      prioritas: 1,
      targetLevel: 'rt',
      targetTerritoryId: rtSample[0],
      estimasiDampak: 'Penurunan risiko gizi jika respons <24j',
      risikoJikaTidak: 'Lonjakan laporan kesehatan minggu berikutnya',
      confidence: 0.7,
    },
  });
  const dec = await prisma.humanDecision.create({
    data: { recommendationId: rec.id, decidedByUserId: admin.id, outcome: 'diterima', alasan: 'Sesuai SOP BPBD dan stok CSR tersedia' },
  });
  await prisma.outcomeTracking.create({
    data: { humanDecisionId: dec.id, windowStart: new Date(), windowEnd: new Date(Date.now() + 30 * 86400000), assessment: 'campuran', impactScore: 0.62, narrative: 'Laporan darurat turun 18% dalam 10 hari (simulasi seed)' },
  });
  await prisma.aILearningMemory.create({ data: { lesson: 'Respons pangan cepat menurunkan stres laporan warga pasca banjir ringan', evidenceCount: 3 } });
  await prisma.aIFailureMemory.create({ data: { recommendationId: rec.id, failureKind: 'false_positive', reason: 'Model menduga PHK industri padahal hanya libur pabrik', detail: 'Digunakan untuk kalibrasi' } });
  await prisma.aICausalInference.create({
    data: { claim: 'Banjir ringan meningkatkan proporsi pembelian mie instan & air mineral di warmindo radius RT', territoryLevel: 'rt', territoryId: rtSample[0], method: 'rule_based', confidence: 0.58, evidenceSummary: 'Sale lines + disaster window', repeatCount: 2 },
  });
  await prisma.dataConfidenceRecord.create({
    data: { subjectType: 'territorial_rt', subjectId: rtSample[0], territoryLevel: 'rt', territoryId: rtSample[0], completeness: 0.78, validity: 0.71, trustScore: 0.74, conflictFlags: ['nik_duplikat_ringan'] },
  });
  }

  await prisma.publicOfficial.upsert({where:{id:1},update:{},create:{namaLengkap:'Sigit Purnomo Said',gelarBelakang:'S.A.P.',officialPhotoUrl:null,jabatan:'Anggota DPR RI',lembaga:'DPR RI',fraksi:'Fraksi Partai Amanat Nasional',partai:'Partai Amanat Nasional (PAN)',komisi:'Komisi VIII DPR RI',dapil:'DKI Jakarta II',periode:'2024–2029',fokusKomisi:['Agama','Sosial','Haji','Bantuan Sosial','Kebencanaan','Perlindungan Anak','Lansia','Penyandang Disabilitas','Kelompok Rentan','Pemberdayaan Sosial'],waAspirasi:'6281234567890',instagram:'@sigitpurnomosaid',bioSingkat:'Anggota DPR RI Fraksi PAN Dapil DKI Jakarta II, berkomitmen memperjuangkan kesejahteraan warga Jakarta.',visi:'Jakarta yang adil, sejahtera, dan berkeadilan sosial untuk seluruh warga.',misi:['Memperkuat program bantuan sosial tepat sasaran','Mendorong pemberdayaan ekonomi warga melalui UMKM dan Warmindo','Memastikan perlindungan anak, lansia, dan penyandang disabilitas','Mengawal pengelolaan dana haji yang transparan','Memperjuangkan infrastruktur sosial di Jakarta']}}).catch(()=>{});
  const off2 = await prisma.publicOfficial.findFirst({ where: { id: 1 } });
  if (off2 && (await prisma.publicActivityFact.count({ where: { officialId: off2.id, aidProgramId: prog2.id } })) < 1) {
    await prisma.publicActivityFact.create({
      data: {
        officialId: off2.id,
        aidProgramId: prog2.id,
        activityKind: 'kunjungan',
        kelurahanId: kapukId,
        rtId: rtSample[0],
        beneficiaryCount: 35,
        ringkasan: 'Kunjungan reses — distribusi sembako',
      },
    });
  }

  console.log('✅ Extended ops: warmindo finance/workforce, aid fairness, territorial & AI memory');

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
  console.log(`║ admin@jakdata.id / admin123            ║`);
  console.log(`║ manager.wrm001@jakdata.id / warmindo123 ║`);
  console.log(`║ kasir.wrm001@jakdata.id / warmindo123   ║`);
  console.log(`║ finance@jakdata.id / finance123         ║`);
  console.log(`║ auditor@jakdata.id / auditor123         ║`);
  console.log(`╚════════════════════════════╝`);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
