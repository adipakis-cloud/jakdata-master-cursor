const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  console.log("provinsi:", await prisma.provinsi.count());
  console.log("kota:", await prisma.kota.count());
  console.log("kecamatan:", await prisma.kecamatan.count());
  console.log("kelurahan:", await prisma.kelurahan.count());
  console.log("rw:", await prisma.rW.count());
  console.log("rt:", await prisma.rT.count());
  console.log("warga:", await prisma.warga.count());
  console.log("users:", await prisma.user.count());
  await prisma.$disconnect();
})();
