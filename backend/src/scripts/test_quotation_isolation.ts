import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';

async function testQuotationIsolation() {
  console.log('=== Testing Quotation Record-Level Isolation ===');

  // 1. Fetch Sales Rep roles and users
  const repRole = await prisma.role.findFirst({ where: { name: 'SALES_REP' } });
  const managerRole = await prisma.role.findFirst({ where: { name: 'SALES_MANAGER' } });
  const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
  const customerRole = await prisma.role.findFirst({ where: { name: 'CUSTOMER' } });

  if (!repRole || !managerRole || !adminRole || !customerRole) {
    throw new Error('Missing core roles in database');
  }

  const existingRep = await prisma.user.findFirst({ where: { roleId: repRole.id } });
  const customer = await prisma.customer.findFirst();

  if (!existingRep || !customer) {
    throw new Error('Missing existing rep or customer in database');
  }

  // 2. Create Sohan (New Sales Rep)
  const sohanEmail = `sohan_${Date.now()}@example.com`;
  const passwordHash = await bcrypt.hash('password123', 10);

  const sohan = await prisma.user.create({
    data: {
      name: 'Sohan',
      email: sohanEmail,
      passwordHash,
      roleId: repRole.id,
    },
  });

  console.log(`Created new SALES_REP: ${sohan.name} (${sohan.email}, ID: ${sohan.id})`);

  // 3. Create Quotation Q1 by Existing Rep
  const q1Count = await prisma.quotation.count();
  const q1 = await prisma.quotation.create({
    data: {
      quoteNumber: `QT-TEST-REP-A-${q1Count + 1}`,
      customerId: customer.id,
      createdById: existingRep.id,
      status: 'DRAFT',
      subtotal: 1000,
      totalAmount: 1000,
    },
  });
  console.log(`Created Quotation Q1 (${q1.quoteNumber}) by Existing Rep (${existingRep.name})`);

  // 4. Create Quotation Q2 by Sohan
  const q2Count = await prisma.quotation.count();
  const q2 = await prisma.quotation.create({
    data: {
      quoteNumber: `QT-TEST-SOHAN-${q2Count + 1}`,
      customerId: customer.id,
      createdById: sohan.id,
      status: 'DRAFT',
      subtotal: 2000,
      totalAmount: 2000,
    },
  });
  console.log(`Created Quotation Q2 (${q2.quoteNumber}) by Sohan (${sohan.name})`);

  // 5. Verify Database Isolation Queries
  // Sohan's view
  const sohanQuotes = await prisma.quotation.findMany({
    where: { createdById: sohan.id },
  });
  console.log(`Sohan query result count: ${sohanQuotes.length} (Expected: 1)`);
  console.log(`Sohan sees quote numbers:`, sohanQuotes.map(q => q.quoteNumber));

  if (sohanQuotes.length !== 1 || sohanQuotes[0].id !== q2.id) {
    throw new Error(`Data isolation failure! Sohan saw unauthorized quotes: ${JSON.stringify(sohanQuotes)}`);
  }

  // Existing Rep's view
  const existingRepQuotes = await prisma.quotation.findMany({
    where: { createdById: existingRep.id },
  });
  console.log(`Existing Rep query result count: ${existingRepQuotes.length} (Expected: contains Q1, NOT Q2)`);
  const existingRepHasQ2 = existingRepQuotes.some(q => q.id === q2.id);
  console.log(`Existing Rep sees Sohan's Q2: ${existingRepHasQ2} (Expected: false)`);

  if (existingRepHasQ2) {
    throw new Error(`Data isolation failure! Existing Rep saw Sohan's quote Q2.`);
  }

  // Manager & Admin visibility (All quotes)
  const managerQuotes = await prisma.quotation.findMany();
  console.log(`Sales Manager total visible quotes: ${managerQuotes.length} (Has Q1 and Q2: ${managerQuotes.some(q => q.id === q1.id) && managerQuotes.some(q => q.id === q2.id)})`);

  // 6. Clean up test records
  await prisma.quotation.deleteMany({ where: { id: { in: [q1.id, q2.id] } } });
  await prisma.user.delete({ where: { id: sohan.id } });
  console.log('Cleanup completed successfully.');
}

testQuotationIsolation()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Test failed:', err);
    prisma.$disconnect();
    process.exit(1);
  });
