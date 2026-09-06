import { prisma } from '../config/prisma';

async function testCustomerGrowthOpportunities() {
  console.log('=== Testing Customer Growth Opportunities Integration ===');

  // 1. Fetch a customer and their existing items/purchases
  const customer = await prisma.customer.findFirst({
    include: {
      quotations: { include: { items: { include: { product: true } } } },
      orders: { include: { items: { include: { product: true } } } },
      subscriptions: { include: { product: true } },
    },
  });

  if (!customer) throw new Error('No customer found in test database');

  console.log(`Testing Customer: ${customer.companyName} (ID: ${customer.id})`);

  // Collect existing product IDs
  const ownedProductIds = new Set<string>();
  for (const q of customer.quotations) {
    for (const i of q.items) ownedProductIds.add(i.productId);
  }
  for (const o of customer.orders) {
    for (const i of o.items) ownedProductIds.add(i.productId);
  }
  for (const s of customer.subscriptions) ownedProductIds.add(s.productId);

  console.log(`Customer owns/quoted ${ownedProductIds.size} distinct products.`);

  // 2. Query active UpsellRules
  const matchingRules = await prisma.upsellRule.findMany({
    where: {
      isActive: true,
      sourceProductId: { in: Array.from(ownedProductIds) },
    },
    include: {
      sourceProduct: true,
      suggestedProduct: true,
    },
  });

  console.log(`Found ${matchingRules.length} matching upsell rules for customer's owned products.`);

  for (const rule of matchingRules) {
    console.log(`- Recommendation: ${rule.suggestedProduct?.name} (Source: ${rule.sourceProduct?.name}, Tag: ${rule.promotionTag || 'N/A'})`);
  }

  console.log('Customer Growth Opportunities integration test completed successfully.');
}

testCustomerGrowthOpportunities()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Test failed:', err);
    prisma.$disconnect();
    process.exit(1);
  });
