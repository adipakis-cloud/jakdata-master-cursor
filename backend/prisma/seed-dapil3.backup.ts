import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function getRtCount(n: number) { return n<=3?5:n<=6?6:n<=9?5:4; }
function pad(n: number) { return String(n).padStart(3,'0'); }

async function upsertKec(kotaId:number,nama:string,kode:string){
  return prisma.kecamatan.upsert({where:{kotaId_nama:{kotaId,nama}},update:{kode},create:{kotaId,nama,kode}});
}
async function upsertKel(kecamatanId:number,nama:string,kode:string){
  return prisma.kelurahan.upsert({where:{kecamatanId_nama:{kecamatanId,nama}},update:{kode},create:{kecamatanId,nama,kode}});
}
async function seedArea(kecamatanId:number,list:Array<{nama:string;kode:string;rwCount:number}>){
  for(const kel of list){
    const k=await upsertKel(kecamatanId,kel.nama,kel.kode);
    for(let rw=1;rw<=kel.rwCount;rw++){
      const r=await prisma.rW.upsert({where:{kelurahanId_nomor:{kelurahanId:k.id,nomor:pad(rw)}},update:{},create:{kelurahanId:k.id,nomor:pad(rw)}});
      for(let rt=1;rt<=getRtCount(rw);rt++){
        const kk=40+Math.floor(Math.random()*41);
        await prisma.rT.upsert({where:{rwId_nomor:{rwId:r.id,nomor:pad(rt)}},update:{},create:{rwId:r.id,nomor:pad(rt),jumlahKk:kk,targetWarga:kk*3}});
      }
    }
  }
}

async function main(){
  const prov=await prisma.provinsi.upsert({where:{nama:'DKI Jakarta'},update:{kode:'DKI'},create:{nama:'DKI Jakarta',kode:'DKI'}});

  // JAKARTA UTARA
  const jakut=await prisma.kota.upsert({where:{provinsiId_nama:{provinsiId:prov.id,nama:'Jakarta Utara'}},update:{kode:'3172'},create:{provinsiId:prov.id,nama:'Jakarta Utara',kode:'3172',tipe:'kota'}});
  const pen=await upsertKec(jakut.id,'Penjaringan','3172010');
  await seedArea(pen.id,[{nama:'Penjaringan',kode:'3172010001',rwCount:11},{nama:'Pluit',kode:'3172010002',rwCount:10},{nama:'Pejagalan',kode:'3172010003',rwCount:9},{nama:'Kamal Muara',kode:'3172010004',rwCount:5},{nama:'Kapuk Muara',kode:'3172010005',rwCount:6}]);
  const pad2=await upsertKec(jakut.id,'Pademangan','3172020');
  await seedArea(pad2.id,[{nama:'Pademangan Timur',kode:'3172020001',rwCount:10},{nama:'Pademangan Barat',kode:'3172020002',rwCount:9},{nama:'Ancol',kode:'3172020003',rwCount:7}]);
  const tp=await upsertKec(jakut.id,'Tanjung Priok','3172030');
  await seedArea(tp.id,[{nama:'Tanjung Priok',kode:'3172030001',rwCount:10},{nama:'Sunter Agung',kode:'3172030002',rwCount:15},{nama:'Papanggo',kode:'3172030003',rwCount:8},{nama:'Sungai Bambu',kode:'3172030004',rwCount:7},{nama:'Kebon Bawang',kode:'3172030005',rwCount:9},{nama:'Sunter Jaya',kode:'3172030006',rwCount:12},{nama:'Warakas',kode:'3172030007',rwCount:8}]);
  const koja=await upsertKec(jakut.id,'Koja','3172040');
  await seedArea(koja.id,[{nama:'Koja',kode:'3172040001',rwCount:9},{nama:'Tugu Utara',kode:'3172040002',rwCount:12},{nama:'Tugu Selatan',kode:'3172040003',rwCount:8},{nama:'Lagoa',kode:'3172040004',rwCount:10},{nama:'Rawa Badak Utara',kode:'3172040005',rwCount:8},{nama:'Rawa Badak Selatan',kode:'3172040006',rwCount:7}]);
  const kg=await upsertKec(jakut.id,'Kelapa Gading','3172050');
  await seedArea(kg.id,[{nama:'Kelapa Gading Barat',kode:'3172050001',rwCount:9},{nama:'Kelapa Gading Timur',kode:'3172050002',rwCount:10},{nama:'Pegangsaan Dua',kode:'3172050003',rwCount:8}]);
  const cil=await upsertKec(jakut.id,'Cilincing','3172060');
  await seedArea(cil.id,[{nama:'Cilincing',kode:'3172060001',rwCount:10},{nama:'Semper Barat',kode:'3172060002',rwCount:10},{nama:'Semper Timur',kode:'3172060003',rwCount:7},{nama:'Rorotan',kode:'3172060004',rwCount:8},{nama:'Marunda',kode:'3172060005',rwCount:6},{nama:'Kali Baru',kode:'3172060006',rwCount:7},{nama:'Sukapura',kode:'3172060007',rwCount:9},{nama:'Tugu',kode:'3172060008',rwCount:6}]);

  // JAKARTA BARAT
  const jakbar=await prisma.kota.upsert({where:{provinsiId_nama:{provinsiId:prov.id,nama:'Jakarta Barat'}},update:{kode:'3173'},create:{provinsiId:prov.id,nama:'Jakarta Barat',kode:'3173',tipe:'kota'}});
  const ceng=await upsertKec(jakbar.id,'Cengkareng','3173010');
  await seedArea(ceng.id,[{nama:'Cengkareng Barat',kode:'3173010001',rwCount:12},{nama:'Cengkareng Timur',kode:'3173010002',rwCount:11},{nama:'Duri Kosambi',kode:'3173010003',rwCount:10},{nama:'Kapuk',kode:'3173010004',rwCount:13},{nama:'Kedaung Kali Angke',kode:'3173010005',rwCount:8},{nama:'Rawa Buaya',kode:'3173010006',rwCount:10}]);
  const grog=await upsertKec(jakbar.id,'Grogol Petamburan','3173020');
  await seedArea(grog.id,[{nama:'Grogol',kode:'3173020001',rwCount:9},{nama:'Tomang',kode:'3173020002',rwCount:11},{nama:'Jelambar',kode:'3173020003',rwCount:9},{nama:'Jelambar Baru',kode:'3173020004',rwCount:8},{nama:'Tanjung Duren Utara',kode:'3173020005',rwCount:7},{nama:'Tanjung Duren Selatan',kode:'3173020006',rwCount:8},{nama:'Wijaya Kusuma',kode:'3173020007',rwCount:10}]);
  const tam=await upsertKec(jakbar.id,'Tambora','3173030');
  await seedArea(tam.id,[{nama:'Tambora',kode:'3173030001',rwCount:11},{nama:'Kali Anyar',kode:'3173030002',rwCount:9},{nama:'Duri Utara',kode:'3173030003',rwCount:7},{nama:'Tanah Sereal',kode:'3173030004',rwCount:9},{nama:'Kerendang',kode:'3173030005',rwCount:7},{nama:'Jembatan Besi',kode:'3173030006',rwCount:8},{nama:'Angke',kode:'3173030007',rwCount:9},{nama:'Jembatan Lima',kode:'3173030008',rwCount:8},{nama:'Duri Selatan',kode:'3173030009',rwCount:6},{nama:'Pekojan',kode:'3173030010',rwCount:8},{nama:'Roa Malaka',kode:'3173030011',rwCount:5}]);
  const kj=await upsertKec(jakbar.id,'Kebon Jeruk','3173040');
  await seedArea(kj.id,[{nama:'Kebon Jeruk',kode:'3173040001',rwCount:10},{nama:'Kedoya Utara',kode:'3173040002',rwCount:9},{nama:'Kedoya Selatan',kode:'3173040003',rwCount:8},{nama:'Duri Kepa',kode:'3173040004',rwCount:10},{nama:'Sukabumi Utara',kode:'3173040005',rwCount:9},{nama:'Sukabumi Selatan',kode:'3173040006',rwCount:8},{nama:'Kelapa Dua',kode:'3173040007',rwCount:7}]);
  const palm=await upsertKec(jakbar.id,'Palmerah','3173050');
  await seedArea(palm.id,[{nama:'Palmerah',kode:'3173050001',rwCount:10},{nama:'Slipi',kode:'3173050002',rwCount:9},{nama:'Kota Bambu Utara',kode:'3173050003',rwCount:7},{nama:'Kota Bambu Selatan',kode:'3173050004',rwCount:7},{nama:'Jati Pulo',kode:'3173050005',rwCount:8},{nama:'Kemanggisan',kode:'3173050006',rwCount:10}]);
  const kal=await upsertKec(jakbar.id,'Kalideres','3173060');
  await seedArea(kal.id,[{nama:'Kalideres',kode:'3173060001',rwCount:11},{nama:'Semanan',kode:'3173060002',rwCount:10},{nama:'Tegal Alur',kode:'3173060003',rwCount:12},{nama:'Pegadungan',kode:'3173060004',rwCount:9},{nama:'Kamal',kode:'3173060005',rwCount:8}]);
  const kem=await upsertKec(jakbar.id,'Kembangan','3173070');
  await seedArea(kem.id,[{nama:'Kembangan Utara',kode:'3173070001',rwCount:9},{nama:'Kembangan Selatan',kode:'3173070002',rwCount:8},{nama:'Srengseng',kode:'3173070003',rwCount:9},{nama:'Joglo',kode:'3173070004',rwCount:9},{nama:'Meruya Utara',kode:'3173070005',rwCount:10},{nama:'Meruya Selatan',kode:'3173070006',rwCount:8}]);
  const tms=await upsertKec(jakbar.id,'Tamansari','3173080');
  await seedArea(tms.id,[{nama:'Tamansari',kode:'3173080001',rwCount:8},{nama:'Krukut',kode:'3173080002',rwCount:7},{nama:'Maphar',kode:'3173080003',rwCount:6},{nama:'Tangki',kode:'3173080004',rwCount:6},{nama:'Mangga Besar',kode:'3173080005',rwCount:7},{nama:'Kemukus',kode:'3173080006',rwCount:5},{nama:'Pinangsia',kode:'3173080007',rwCount:8},{nama:'Glodok',kode:'3173080008',rwCount:7},{nama:'Keagungan',kode:'3173080009',rwCount:6}]);

  // KEPULAUAN SERIBU
  const kep=await prisma.kota.upsert({where:{provinsiId_nama:{provinsiId:prov.id,nama:'Kepulauan Seribu'}},update:{kode:'3101'},create:{provinsiId:prov.id,nama:'Kepulauan Seribu',kode:'3101',tipe:'kabupaten'}});
  const ku=await upsertKec(kep.id,'Kepulauan Seribu Utara','3101010');
  await seedArea(ku.id,[{nama:'Pulau Panggang',kode:'3101010001',rwCount:3},{nama:'Pulau Kelapa',kode:'3101010002',rwCount:3},{nama:'Pulau Harapan',kode:'3101010003',rwCount:2}]);
  const ks=await upsertKec(kep.id,'Kepulauan Seribu Selatan','3101020');
  await seedArea(ks.id,[{nama:'Pulau Tidung',kode:'3101020001',rwCount:3},{nama:'Pulau Pari',kode:'3101020002',rwCount:2},{nama:'Pulau Untung Jawa',kode:'3101020003',rwCount:2}]);

  const kodes=['3172','3173','3101'];
  const [tkec,tkel,trw,trt]=await Promise.all([
    prisma.kecamatan.count({where:{kota:{kode:{in:kodes}}}}),
    prisma.kelurahan.count({where:{kecamatan:{kota:{kode:{in:kodes}}}}}),
    prisma.rW.count({where:{kelurahan:{kecamatan:{kota:{kode:{in:kodes}}}}}}),
    prisma.rT.count({where:{rw:{kelurahan:{kecamatan:{kota:{kode:{in:kodes}}}}}}}),
  ]);
  console.log('=== DAPIL 3 DONE ===');
  console.log('Kecamatan:',tkec,'Kelurahan:',tkel,'RW:',trw,'RT:',trt);
}

main().catch(console.error).finally(()=>prisma.$disconnect());


