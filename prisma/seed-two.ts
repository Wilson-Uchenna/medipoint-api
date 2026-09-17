// prisma/seed.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole, UserStatus } from '../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
})

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL_2;
  const password = process.env.SEED_ADMIN_PASSWORD_2;

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL_2 and SEED_ADMIN_PASSWORD_2 must be set');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin already exists, skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      phoneNumber: '08054645742',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  console.log(`Admin created: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());