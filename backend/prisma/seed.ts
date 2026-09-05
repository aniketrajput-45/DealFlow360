import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seed...');

  // 1. Roles
  const roles = [
    { name: 'ADMIN', description: 'System Administrator with full setup and reporting access' },
    { name: 'SALES_REP', description: 'Sales Representative who builds quotes and manages customer deals' },
    { name: 'SALES_MANAGER', description: 'Sales Manager who reviews discounts and approves deals' },
    { name: 'FINANCE', description: 'Finance user who handles second-level approvals and billing' },
    { name: 'WAREHOUSE', description: 'Warehouse user managing fulfillment allocations' },
    { name: 'CUSTOMER', description: 'Restricted external customer portal user' },
  ];

  const roleMap = new Map<string, string>();
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    roleMap.set(r.name, role.id);
  }
  console.log(`[Seed] Created ${roleMap.size} roles.`);

  // 2. Customer Tiers
  const tiers = [
    { name: 'Bronze', maxDiscountPercent: 5.0, description: 'Standard tier with up to 5% allowed discount' },
    { name: 'Silver', maxDiscountPercent: 10.0, description: 'Growth tier with up to 10% allowed discount' },
    { name: 'Gold', maxDiscountPercent: 15.0, description: 'Enterprise tier with up to 15% allowed discount' },
  ];

  const tierMap = new Map<string, string>();
  for (const t of tiers) {
    const tier = await prisma.customerTier.upsert({
      where: { name: t.name },
      update: { maxDiscountPercent: t.maxDiscountPercent, description: t.description },
      create: t,
    });
    tierMap.set(t.name, tier.id);
  }
  console.log(`[Seed] Created ${tierMap.size} customer tiers.`);

  // 3. Customers
  const customers = [
    {
      companyName: 'Acme Innovations Ltd',
      contactName: 'Rajesh Sharma',
      email: 'rajesh@acme.com',
      phone: '+91 98201 12345',
      address: 'Tech Park, Whitefield, Bengaluru',
      tierId: tierMap.get('Gold')!,
    },
    {
      companyName: 'Beta Industries Corp',
      contactName: 'Priya Mehta',
      email: 'priya@betacorp.com',
      phone: '+91 98110 54321',
      address: 'Nariman Point, Mumbai',
      tierId: tierMap.get('Silver')!,
    },
    {
      companyName: 'Gamma Enterprises',
      contactName: 'Arun Kumar',
      email: 'arun@gamma.in',
      phone: '+91 98400 98765',
      address: 'Sector 62, Noida',
      tierId: tierMap.get('Bronze')!,
    },
  ];

  const customerMap = new Map<string, string>();
  for (const c of customers) {
    const cust = await prisma.customer.upsert({
      where: { email: c.email },
      update: c,
      create: c,
    });
    customerMap.set(c.companyName, cust.id);
  }
  console.log(`[Seed] Created ${customerMap.size} customers.`);

  // 4. Users
  const passwordHash = await bcrypt.hash('password123', 10);
  const users = [
    {
      name: 'Super Admin',
      email: 'admin@dealflow360.com',
      passwordHash,
      roleId: roleMap.get('ADMIN')!,
    },
    {
      name: 'Alex Morgan (Sales Rep)',
      email: 'rep@dealflow360.com',
      passwordHash,
      roleId: roleMap.get('SALES_REP')!,
    },
    {
      name: 'Sarah Connor (Sales Manager)',
      email: 'manager@dealflow360.com',
      passwordHash,
      roleId: roleMap.get('SALES_MANAGER')!,
    },
    {
      name: 'David Vance (Finance)',
      email: 'finance@dealflow360.com',
      passwordHash,
      roleId: roleMap.get('FINANCE')!,
    },
    {
      name: 'Walter White (Warehouse)',
      email: 'warehouse@dealflow360.com',
      passwordHash,
      roleId: roleMap.get('WAREHOUSE')!,
    },
    {
      name: 'Rajesh Sharma (Acme Buyer)',
      email: 'customer@acme.com',
      passwordHash,
      roleId: roleMap.get('CUSTOMER')!,
      customerId: customerMap.get('Acme Innovations Ltd'),
    },
    {
      name: 'Priya Mehta (Beta Buyer)',
      email: 'customer@beta.com',
      passwordHash,
      roleId: roleMap.get('CUSTOMER')!,
      customerId: customerMap.get('Beta Industries Corp'),
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        roleId: u.roleId,
        passwordHash: u.passwordHash,
        customerId: u.customerId || null,
      },
      create: u,
    });
  }
  console.log(`[Seed] Created ${users.length} users.`);

  // 5. Product Categories
  const categories = [
    { name: 'Hardware', description: 'Physical compute, laptops, and networking hardware' },
    { name: 'Services', description: 'Professional deployment, setup, and consulting services' },
    { name: 'Subscriptions', description: 'Cloud software licenses and recurring maintenance plans' },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const c = await prisma.productCategory.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: cat,
    });
    categoryMap.set(cat.name, c.id);
  }
  console.log(`[Seed] Created ${categoryMap.size} product categories.`);

  // 6. Discount Rules
  const discountRules = [
    {
      categoryId: categoryMap.get('Hardware')!,
      maxDiscountPercent: 15.0,
      approvalLevel: 'SALES_MANAGER',
    },
    {
      categoryId: categoryMap.get('Services')!,
      maxDiscountPercent: 10.0,
      approvalLevel: 'SALES_MANAGER',
    },
    {
      categoryId: categoryMap.get('Subscriptions')!,
      maxDiscountPercent: 10.0,
      approvalLevel: 'SALES_MANAGER',
    },
  ];

  for (const dr of discountRules) {
    const existing = await prisma.discountRule.findFirst({
      where: { categoryId: dr.categoryId },
    });
    if (existing) {
      await prisma.discountRule.update({
        where: { id: existing.id },
        data: dr,
      });
    } else {
      await prisma.discountRule.create({ data: dr });
    }
  }
  console.log('[Seed] Configured category discount rules.');

  // 7. Products
  const products = [
    {
      name: 'Dell Latitude Pro 15',
      categoryId: categoryMap.get('Hardware')!,
      description: 'Enterprise laptop, Intel Core Ultra 7, 32GB RAM, 1TB SSD',
      unit: 'unit',
      basePrice: 80000,
      costPrice: 62000,
      taxPercent: 18,
      productType: 'ONE_TIME',
    },
    {
      name: 'ThinkStation Server X1',
      categoryId: categoryMap.get('Hardware')!,
      description: 'Rackmount server, 64-Core AMD EPYC, 256GB ECC RAM',
      unit: 'unit',
      basePrice: 150000,
      costPrice: 115000,
      taxPercent: 18,
      productType: 'ONE_TIME',
    },
    {
      name: 'Setup & Onboarding Service',
      categoryId: categoryMap.get('Services')!,
      description: 'Professional on-site hardware setup, OS configuration, and deployment',
      unit: 'package',
      basePrice: 15000,
      costPrice: 7000,
      taxPercent: 18,
      productType: 'ONE_TIME',
    },
    {
      name: 'Security Hardening & Audit',
      categoryId: categoryMap.get('Services')!,
      description: 'System security lockdown, compliance testing, and audit report',
      unit: 'service',
      basePrice: 25000,
      costPrice: 12000,
      taxPercent: 18,
      productType: 'ONE_TIME',
    },
    {
      name: 'Cloud Operations License',
      categoryId: categoryMap.get('Subscriptions')!,
      description: 'Recurring cloud management control plane per user',
      unit: 'license/month',
      basePrice: 2500,
      costPrice: 600,
      taxPercent: 18,
      productType: 'RECURRING',
      billingInterval: 'MONTHLY',
    },
    {
      name: '24/7 SLA Mission Critical Support',
      categoryId: categoryMap.get('Subscriptions')!,
      description: '15-minute response time SLA and dedicated technical account manager',
      unit: 'plan/month',
      basePrice: 5000,
      costPrice: 1200,
      taxPercent: 18,
      productType: 'RECURRING',
      billingInterval: 'MONTHLY',
    },
  ];

  const productMap = new Map<string, string>();
  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { name: p.name },
    });
    if (existing) {
      const prod = await prisma.product.update({
        where: { id: existing.id },
        data: p,
      });
      productMap.set(p.name, prod.id);
    } else {
      const prod = await prisma.product.create({
        data: p,
      });
      productMap.set(p.name, prod.id);
    }
  }
  console.log(`[Seed] Created ${productMap.size} products.`);

  // 8. Upsell / Cross-Sell Rules
  const upsellRules = [
    {
      sourceProductId: productMap.get('Dell Latitude Pro 15')!,
      suggestedProductId: productMap.get('Setup & Onboarding Service')!,
      promotionTag: 'BEST COMPLEMENT',
      priority: 1,
    },
    {
      sourceProductId: productMap.get('Dell Latitude Pro 15')!,
      suggestedProductId: productMap.get('24/7 SLA Mission Critical Support')!,
      promotionTag: 'PEACE OF MIND',
      priority: 2,
    },
    {
      sourceProductId: productMap.get('ThinkStation Server X1')!,
      suggestedProductId: productMap.get('Security Hardening & Audit')!,
      promotionTag: 'ENTERPRISE ESSENTIAL',
      priority: 1,
    },
    {
      sourceProductId: productMap.get('ThinkStation Server X1')!,
      suggestedProductId: productMap.get('Cloud Operations License')!,
      promotionTag: 'HYBRID MANAGEMENT',
      priority: 2,
    },
  ];

  for (const ur of upsellRules) {
    const existing = await prisma.upsellRule.findFirst({
      where: {
        sourceProductId: ur.sourceProductId,
        suggestedProductId: ur.suggestedProductId,
      },
    });
    if (!existing) {
      await prisma.upsellRule.create({ data: ur });
    }
  }
  console.log('[Seed] Configured upsell/cross-sell rules.');

  // 9. Warehouses & Inventory
  const warehouses = [
    {
      name: 'Main Warehouse (Mumbai)',
      code: 'WH-MUM',
      address: 'Bhiwandi Logistics Hub, Mumbai, MH',
      shippingCostWeight: 1.0, // Primary warehouse, lower shipping factor
    },
    {
      name: 'East Depot (Kolkata)',
      code: 'WH-KOL',
      address: 'Dankuni Logistics Park, Kolkata, WB',
      shippingCostWeight: 1.4, // Secondary warehouse, higher shipping factor
    },
  ];

  const warehouseMap = new Map<string, string>();
  for (const wh of warehouses) {
    const w = await prisma.warehouse.upsert({
      where: { code: wh.code },
      update: wh,
      create: wh,
    });
    warehouseMap.set(wh.code, w.id);
  }
  console.log(`[Seed] Created ${warehouseMap.size} warehouses.`);

  // Inventory setup:
  // Dell Laptops: 6 in Mumbai, 20 in Kolkata (Total 26)
  // Servers: 4 in Mumbai, 10 in Kolkata
  const inventories = [
    {
      warehouseId: warehouseMap.get('WH-MUM')!,
      productId: productMap.get('Dell Latitude Pro 15')!,
      quantityAvailable: 6,
      reorderLevel: 5,
    },
    {
      warehouseId: warehouseMap.get('WH-KOL')!,
      productId: productMap.get('Dell Latitude Pro 15')!,
      quantityAvailable: 20,
      reorderLevel: 5,
    },
    {
      warehouseId: warehouseMap.get('WH-MUM')!,
      productId: productMap.get('ThinkStation Server X1')!,
      quantityAvailable: 4,
      reorderLevel: 2,
    },
    {
      warehouseId: warehouseMap.get('WH-KOL')!,
      productId: productMap.get('ThinkStation Server X1')!,
      quantityAvailable: 10,
      reorderLevel: 3,
    },
  ];

  for (const inv of inventories) {
    await prisma.inventory.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: inv.warehouseId,
          productId: inv.productId,
        },
      },
      update: { quantityAvailable: inv.quantityAvailable, reorderLevel: inv.reorderLevel },
      create: inv,
    });
  }
  console.log('[Seed] Stocked inventory with multi-warehouse split test quantities.');

  // 10. Deal Health Configuration
  await prisma.dealHealthConfig.upsert({
    where: { id: 'default' },
    update: { stalledDaysThreshold: 3, anomalyDiscountMultiplier: 1.5 },
    create: { id: 'default', stalledDaysThreshold: 3, anomalyDiscountMultiplier: 1.5 },
  });
  console.log('[Seed] Deal health config initialized.');

  console.log('[Seed] Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
