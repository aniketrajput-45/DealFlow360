import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';

async function testUserCreationAndLogin() {
  console.log('--- Testing User Creation & Authentication ---');

  const admin = await prisma.user.findFirst({ where: { role: { name: 'ADMIN' } } });
  const roles = await prisma.role.findMany();
  console.log('Found roles:', roles.map(r => r.name));

  const testEmail = `test_created_user_${Date.now()}@example.com`;
  const rawPassword = 'NewUserSecurePass123!';

  // Step 1: Hash password using bcryptjs
  const hash = await bcrypt.hash(rawPassword, 10);
  console.log('Generated hash:', hash.substring(0, 15) + '...');

  // Step 2: Create User
  const salesRole = roles.find(r => r.name === 'SALES_REP');
  const user = await prisma.user.create({
    data: {
      name: 'Created Test User',
      email: testEmail,
      passwordHash: hash,
      roleId: salesRole!.id,
    },
    include: { role: true }
  });

  console.log(`User created successfully: ID=${user.id}, Email=${user.email}, Role=${user.role.name}`);

  // Step 3: Verify Password Compare
  const validCompare = await bcrypt.compare(rawPassword, user.passwordHash);
  const invalidCompare = await bcrypt.compare('wrong_password', user.passwordHash);
  console.log(`Password verification: Valid pass = ${validCompare}, Invalid pass = ${invalidCompare}`);

  if (!validCompare || invalidCompare) {
    throw new Error('Password hash verification failed!');
  }

  // Step 4: Verify existing demo account password verification
  if (admin) {
    const adminCompare = await bcrypt.compare('password123', admin.passwordHash);
    console.log(`Existing Admin demo user password check: ${adminCompare}`);
  }

  // Clean up
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Cleanup completed successfully.');
}

testUserCreationAndLogin()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Test failed:', err);
    prisma.$disconnect();
    process.exit(1);
  });
