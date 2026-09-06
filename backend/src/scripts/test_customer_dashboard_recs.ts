import { prisma } from '../config/prisma';

async function testCustomerDashboardRecommendations() {
  console.log('=== Testing Customer Dashboard Quotation-Based Recommendations ===');

  // 1. Find a customer user with quotations
  const customerUser = await prisma.user.findFirst({
    where: { role: { name: 'CUSTOMER' }, customerId: { not: null } },
    include: { customer: true },
  });

  if (!customerUser || !customerUser.customerId) {
    throw new Error('No customer user found in test database');
  }

  console.log(`Testing Customer Account: ${customerUser.customer?.companyName} (Customer ID: ${customerUser.customerId})`);

  // 2. Fetch eligible quotations (DRAFT, PENDING_APPROVAL, APPROVED, NEGOTIATION, ACCEPTED)
  const activeQuotations = await prisma.quotation.findMany({
    where: {
      customerId: customerUser.customerId,
      status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'NEGOTIATION', 'ACCEPTED'] },
    },
    include: {
      items: { include: { product: { include: { category: true } } } },
    },
  });

  console.log(`Customer has ${activeQuotations.length} eligible quotations.`);

  // Collect products from quotations
  const quotedProductMap = new Map<string, { name: string; quoteNumber: string }>();
  for (const q of activeQuotations) {
    for (const item of q.items) {
      if (item.product && !quotedProductMap.has(item.productId)) {
        quotedProductMap.set(item.productId, { name: item.product.name, quoteNumber: q.quoteNumber });
      }
    }
  }

  const quotedProductIds = Array.from(quotedProductMap.keys());
  console.log(`Products extracted from customer's quotations (${quotedProductIds.length}):`);
  for (const [id, p] of quotedProductMap) {
    console.log(`  - Product: ${p.name} (Quote #${p.quoteNumber})`);
  }

  // 3. Query active UpsellRules matching customer's quoted products
  const matchingRules = await prisma.upsellRule.findMany({
    where: {
      sourceProductId: { in: quotedProductIds },
      isActive: true,
    },
    include: {
      sourceProduct: { include: { category: true } },
      suggestedProduct: { include: { category: true } },
    },
    orderBy: { priority: 'asc' },
  });

  console.log(`Matching UpsellRules found: ${matchingRules.length}`);

  for (const rule of matchingRules) {
    const isSameCategory = rule.sourceProduct.category?.name === rule.suggestedProduct.category?.name;
    const type = isSameCategory ? 'Upsell' : 'Cross-sell';
    const sourceInfo = quotedProductMap.get(rule.sourceProductId);
    const reason = type === 'Upsell'
      ? `Recommended based on your ${sourceInfo?.name || rule.sourceProduct.name} quotation (#${sourceInfo?.quoteNumber}).`
      : `Recommended as a complementary product to ${sourceInfo?.name || rule.sourceProduct.name} (#${sourceInfo?.quoteNumber}).`;

    console.log(`- [${type}] ${rule.suggestedProduct.name} | ${reason}`);
  }

  console.log('Customer Dashboard Recommendations integration test completed successfully.');
}

testCustomerDashboardRecommendations()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Test failed:', err);
    prisma.$disconnect();
    process.exit(1);
  });
