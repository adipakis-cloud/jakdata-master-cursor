const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

bcrypt.hash('admin123', 10).then(h => {
  return p.user.upsert({
    where: { email: 'admin@jakdata.id' },
    update: { passwordHash: h, aktif: true, loginAttempts: 0, lockedUntil: null },
    create: { nama: 'Administrator', email: 'admin@jakdata.id', passwordHash: h, role: 'admin_pusat' }
  });
}).then(u => {
  console.log('OK:', u.email);
  p.$disconnect();
});