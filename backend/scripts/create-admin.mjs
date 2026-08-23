// One-off admin bootstrap: node scripts/create-admin.mjs [email] [password] [name]
import { PrismaClient } from '@prisma/client';
import { argon2id, argon2Verify } from 'hash-wasm';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

const ARGON_OPTS = { parallelism: 1, iterations: 2, memorySize: 65536, hashLength: 32, outputType: 'encoded' };

async function main() {
  const email = (process.argv[2] ?? 'admin@shinobistore.local').toLowerCase();
  const password = process.argv[3] ?? 'ChangeMe12345';
  const fullName = process.argv[4] ?? 'Store Admin';

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!existing) {
    const passwordHash = await argon2id({ password, salt: randomBytes(16), ...ARGON_OPTS });
    await prisma.user.create({ data: { email, passwordHash, fullName, role: 'admin' } });
    console.log(`created admin ${email}`);
  } else {
    // Promote + reset password to the given credentials.
    const passwordHash = await argon2id({ password, salt: randomBytes(16), ...ARGON_OPTS });
    await prisma.user.update({ where: { email }, data: { passwordHash, role: 'admin', isActive: true, deletedAt: null } });
    console.log(`promoted existing user ${email} to admin (password reset)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
void argon2Verify;
