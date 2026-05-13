const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

(async () => {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@jakdata.id" },
    update: {
      passwordHash,
      aktif: true,
      role: "admin_pusat"
    },
    create: {
      nama: "Admin Pusat JAKDATA",
      email: "admin@jakdata.id",
      passwordHash,
      role: "admin_pusat",
      aktif: true
    }
  });

  console.log("ADMIN READY:", admin.email, "password: admin123");
  await prisma.$disconnect();
})();
