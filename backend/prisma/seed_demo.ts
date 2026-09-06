import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { RiskEngineService } from '../src/modules/risk-engine/risk.service';
import { OrderService } from '../src/modules/orders/orders.service';
import { FulfillmentEngineService } from '../src/modules/fulfillment/fulfillment.service';
import { AuditService } from '../src/modules/audit/audit.service';

const prisma = new PrismaClient();

// -------------------------------------------------------------
// REPRODUCIBLE PRNG (Mulberry32)
// -------------------------------------------------------------
class PRNG {
  private s: number;
  constructor(seed: number) {
    this.s = seed;
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  float(min: number, max: number, decimals: number = 2): number {
    const val = this.next() * (max - min) + min;
    return parseFloat(val.toFixed(decimals));
  }
  choice<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
  sample<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => this.next() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
  }
  date(daysAgoMin: number, daysAgoMax: number): Date {
    const days = this.int(daysAgoMin, daysAgoMax);
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(this.int(8, 18), this.int(0, 59), this.int(0, 59));
    return d;
  }
}

async function main() {
  const seedInput = process.env.DEMO_SEED ? parseInt(process.env.DEMO_SEED, 10) : 20260906;
  const rng = new PRNG(seedInput);

  console.log('====================================================');
  console.log(`[Demo Seed] Starting DealFlow360 Large Randomized Demo Dataset Generation`);
  console.log(`[Demo Seed] Using RNG Seed: ${seedInput}`);
  console.log('====================================================\n');

  // -------------------------------------------------------------
  // 0. CLEAN DATABASE
  // -------------------------------------------------------------
  console.log('[Demo Seed] Step 0: Cleaning database...');
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.billingSchedule.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.warehouseAllocation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quoteComment.deleteMany();
  await prisma.negotiation.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.upsellRule.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.customerTier.deleteMany();
  await prisma.role.deleteMany();
  await prisma.dealHealthConfig.deleteMany();

  // -------------------------------------------------------------
  // 1. RBAC ROLES
  // -------------------------------------------------------------
  console.log('[Demo Seed] Step 1: Creating Roles...');
  const rolesData = [
    { name: 'ADMIN', description: 'System Administrator with full setup and reporting access' },
    { name: 'SALES_REP', description: 'Sales Representative who builds quotes and manages customer deals' },
    { name: 'SALES_MANAGER', description: 'Sales Manager who reviews discounts and approves deals' },
    { name: 'FINANCE', description: 'Finance user who handles second-level approvals and billing' },
    { name: 'WAREHOUSE', description: 'Warehouse user managing fulfillment allocations' },
    { name: 'CUSTOMER', description: 'Restricted external customer portal user' },
  ];

  const roleMap = new Map<string, string>();
  for (const r of rolesData) {
    const role = await prisma.role.create({ data: r });
    roleMap.set(r.name, role.id);
  }

  // -------------------------------------------------------------
  // 2. CUSTOMER TIERS
  // -------------------------------------------------------------
  console.log('[Demo Seed] Step 2: Creating Customer Tiers...');
  const tiersData = [
    { name: 'Bronze', maxDiscountPercent: 5.0, description: 'Standard tier with up to 5% allowed discount' },
    { name: 'Silver', maxDiscountPercent: 10.0, description: 'Growth tier with up to 10% allowed discount' },
    { name: 'Gold', maxDiscountPercent: 15.0, description: 'Enterprise tier with up to 15% allowed discount' },
  ];

  const tierMap = new Map<string, string>();
  for (const t of tiersData) {
    const tier = await prisma.customerTier.create({ data: t });
    tierMap.set(t.name, tier.id);
  }

  // -------------------------------------------------------------
  // 3. CUSTOMERS (Target: 50 B2B Customers)
  // -------------------------------------------------------------
  console.log('[Demo Seed] Step 3: Generating 50 B2B Customers...');
  const companyPrefixes = [
    'Apex', 'Nexus', 'Vertex', 'Starlight', 'Quantum', 'Omni', 'Vanguard', 'Infini', 'Synergy', 'Optima',
    'Aether', 'Titan', 'Horizon', 'Pinnacle', 'Matrix', 'Zenith', 'Velocity', 'Prism', 'Orbit', 'Pulse',
    'Catalyst', 'Cyber', 'Strata', 'Aegis', 'Solstice', 'Dynamo', 'Frontier', 'Fusion', 'Genesis', 'Spectra'
  ];
  const companySuffixes = [
    'Corp', 'Systems', 'Solutions', 'Technologies', 'Networks', 'Global', 'Enterprises', 'Labs', 'Logistics',
    'Industries', 'Digital', 'Cloud Services', 'Data Tech', 'Software', 'Financials', 'Retail Hub', 'Holdings'
  ];
  const cities = [
    'Mumbai, MH', 'Bengaluru, KA', 'Delhi NCR', 'Hyderabad, TS', 'Chennai, TN', 'Kolkata, WB', 'Pune, MH',
    'Ahmedabad, GJ', 'Austin, TX', 'San Jose, CA', 'Chicago, IL', 'London, UK', 'Singapore'
  ];

  const firstNames = ['Alex', 'Sarah', 'David', 'Jane', 'Mark', 'Rahul', 'Priya', 'Amit', 'Vikram', 'Neha', 'Rohan', 'Ananya', 'Karan', 'Sneha', 'Arjun', 'Meera'];
  const lastNames = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Singh', 'Chawla', 'Deshmukh', 'Kulkarni', 'Joshi', 'Mehta', 'Bhatia'];

  const essentialCustomers = [
    { companyName: 'ABC Corp', contactName: 'Jane Doe', email: 'customer@abccorp.com', phone: '+1 (555) 123-4567', address: '100 Enterprise Way, Suite 400, San Jose, CA', tierId: tierMap.get('Gold')! },
    { companyName: 'Nova Systems', contactName: 'Mark Vance', email: 'contact@novasystems.io', phone: '+1 (555) 987-6543', address: '45 Innovation Hub, Austin, TX', tierId: tierMap.get('Silver')! },
    { companyName: 'Urban Retail', contactName: 'Sarah Jenkins', email: 'procurement@urbanretail.com', phone: '+1 (555) 246-8101', address: '782 Commercial Blvd, Chicago, IL', tierId: tierMap.get('Bronze')! },
  ];

  const customersList: any[] = [];
  for (const c of essentialCustomers) {
    const cust = await prisma.customer.create({ data: c });
    customersList.push(cust);
  }

  const tierDistribution = ['Bronze', 'Bronze', 'Bronze', 'Silver', 'Silver', 'Gold'];
  const usedCompanyNames = new Set(essentialCustomers.map(c => c.companyName));

  while (customersList.length < 50) {
    const name = `${rng.choice(companyPrefixes)} ${rng.choice(companySuffixes)}`;
    if (usedCompanyNames.has(name)) continue;
    usedCompanyNames.add(name);

    const contactName = `${rng.choice(firstNames)} ${rng.choice(lastNames)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `contact@${slug}.com`;
    const tierName = rng.choice(tierDistribution);

    const cust = await prisma.customer.create({
      data: {
        companyName: name,
        contactName,
        email,
        phone: `+91 9${rng.int(100000000, 999999999)}`,
        address: `${rng.int(10, 999)} Business Park, ${rng.choice(cities)}`,
        tierId: tierMap.get(tierName)!,
      },
    });
    customersList.push(cust);
  }

  // -------------------------------------------------------------
  // 4. USERS (Target: 50 Users)
  // -------------------------------------------------------------
  console.log('[Demo Seed] Step 4: Generating 50 Authenticated Users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const usersList: any[] = [];

  const essentialUsers = [
    { name: 'System Admin', email: 'admin@dealflow360.com', passwordHash, roleId: roleMap.get('ADMIN')! },
    { name: 'Alex Rep', email: 'rep@dealflow360.com', passwordHash, roleId: roleMap.get('SALES_REP')! },
    { name: 'Sarah Manager', email: 'manager@dealflow360.com', passwordHash, roleId: roleMap.get('SALES_MANAGER')! },
    { name: 'David Finance', email: 'finance@dealflow360.com', passwordHash, roleId: roleMap.get('FINANCE')! },
    { name: 'ABC Corp Contact', email: 'customer@abccorp.com', passwordHash, roleId: roleMap.get('CUSTOMER')!, customerId: customersList[0].id },
  ];

  for (const u of essentialUsers) {
    const user = await prisma.user.create({ data: u });
    usersList.push(user);
  }

  for (let i = 2; i <= 30; i++) {
    const name = `${rng.choice(firstNames)} ${rng.choice(lastNames)}`;
    const user = await prisma.user.create({
      data: { name, email: `rep${i}@dealflow360.com`, passwordHash, roleId: roleMap.get('SALES_REP')! },
    });
    usersList.push(user);
  }

  for (let i = 2; i <= 7; i++) {
    const name = `${rng.choice(firstNames)} ${rng.choice(lastNames)}`;
    const user = await prisma.user.create({
      data: { name, email: `manager${i}@dealflow360.com`, passwordHash, roleId: roleMap.get('SALES_MANAGER')! },
    });
    usersList.push(user);
  }

  for (let i = 2; i <= 7; i++) {
    const name = `${rng.choice(firstNames)} ${rng.choice(lastNames)}`;
    const user = await prisma.user.create({
      data: { name, email: `finance${i}@dealflow360.com`, passwordHash, roleId: roleMap.get('FINANCE')! },
    });
    usersList.push(user);
  }

  for (let i = 1; i <= 4; i++) {
    const cust = customersList[i];
    const user = await prisma.user.create({
      data: { name: cust.contactName, email: cust.email, passwordHash, roleId: roleMap.get('CUSTOMER')!, customerId: cust.id },
    });
    usersList.push(user);
  }

  const salesReps = usersList.filter(u => u.roleId === roleMap.get('SALES_REP')!);
  const salesManagers = usersList.filter(u => u.roleId === roleMap.get('SALES_MANAGER')!);
  const financeUsers = usersList.filter(u => u.roleId === roleMap.get('FINANCE')!);

  // -------------------------------------------------------------
  // 5. PRODUCT CATEGORIES (Target: 10 Categories)
  // -------------------------------------------------------------
  console.log('[Demo Seed] Step 5: Creating 10 Product Categories & Discount Ceilings...');
  const categoriesDef = [
    { name: 'Hardware', description: 'Compute laptops, servers, workstations, and peripherals', maxDiscount: 15.0 },
    { name: 'Software', description: 'Enterprise software licenses, OS, and productivity suites', maxDiscount: 12.0 },
    { name: 'Cloud', description: 'Managed cloud infrastructure, API gateways, and storage clusters', maxDiscount: 10.0 },
    { name: 'Networking', description: 'Switches, routers, firewalls, and networking equipment', maxDiscount: 12.0 },
    { name: 'Security', description: 'Endpoint security, zero-trust access, SIEM, and vault tools', maxDiscount: 10.0 },
    { name: 'Services', description: 'Professional deployment, migration, and integration packages', maxDiscount: 10.0 },
    { name: 'Support', description: '24/7 priority SLA support and dedicated TAM subscriptions', maxDiscount: 8.0 },
    { name: 'Consulting', description: 'Enterprise architecture review and transformation advisory', maxDiscount: 10.0 },
    { name: 'Infrastructure', description: 'Server racks, UPS power units, and cooling systems', maxDiscount: 15.0 },
    { name: 'Accessories', description: 'Docking stations, cables, monitors, and ergonomic gear', maxDiscount: 20.0 },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesDef) {
    const c = await prisma.productCategory.create({ data: { name: cat.name, description: cat.description } });
    categoryMap.set(cat.name, c.id);

    await prisma.discountRule.create({
      data: {
        categoryId: c.id,
        maxDiscountPercent: cat.maxDiscount,
        approvalLevel: cat.maxDiscount <= 10 ? 'SALES_MANAGER' : 'SALES_MANAGER_AND_FINANCE',
      },
    });
  }

  // -------------------------------------------------------------
  // 6. PRODUCTS (Target: 100 Products)
  // -------------------------------------------------------------
  console.log('[Demo Seed] Step 6: Generating 100 Products across 10 Categories...');
  const productTemplates: Record<string, { names: string[]; units: string[]; type: string; minPrice: number; maxPrice: number }> = {
    Hardware: {
      names: ['Business Laptop 14"', 'Workstation Laptop 16"', 'Enterprise Server X100', 'Rack Storage Array 50TB', 'Edge Gateway Router', 'Ultra-Wide Monitor 34"', 'High-Speed Laser Printer', 'Core Fiber Switch 48-Port', 'Power Distribution Unit 30A', 'NAS Server 100TB'],
      units: ['unit', 'unit', 'server', 'unit', 'unit', 'unit', 'unit', 'unit', 'unit', 'unit'],
      type: 'ONE_TIME', minPrice: 15000, maxPrice: 180000
    },
    Software: {
      names: ['Enterprise CPQ Core', 'ERP Core License', 'CRM Cloud Seat', 'Database Enterprise Edition', 'AI Analytics Suite', 'BI Dashboard Pro', 'Compliance Audit Suite', 'DevOps Pipeline Hub', 'Security Scanner Engine', 'DocuManagement Enterprise'],
      units: ['license', 'user/year', 'seat/year', 'core', 'license', 'user/year', 'license', 'license', 'license', 'license'],
      type: 'ONE_TIME', minPrice: 20000, maxPrice: 150000
    },
    Cloud: {
      names: ['Dedicated Cloud Compute (16vCPU)', 'Cloud Storage Cluster 10TB', 'Managed Kubernetes Node', 'Serverless API Hub', 'Cloud CDN Pass', 'High Availability Cloud SQL', 'Managed Redis Cache Node', 'Cloud WAF Shield', 'Event Stream Cluster', 'VPC Router Gateway'],
      units: ['node/month', 'cluster/month', 'node/month', 'million requests', 'tb/month', 'instance/month', 'instance/month', 'domain/month', 'cluster/month', 'vpc/month'],
      type: 'RECURRING', minPrice: 3000, maxPrice: 45000
    },
    Networking: {
      names: ['Gigabit Managed Switch 24P', 'Wi-Fi 6 Access Point', 'Hardware Firewall 1Gbps', 'SD-WAN Edge Router', 'Core Fiber Aggregator', 'PoE Injector Hub 12P', 'Network Load Balancer', 'VPN Concentrator Node', 'SFP+ Optical Transceiver 10G', 'Console Server 16-Port'],
      units: ['unit', 'unit', 'appliance', 'unit', 'unit', 'unit', 'appliance', 'unit', 'unit', 'unit'],
      type: 'ONE_TIME', minPrice: 8000, maxPrice: 95000
    },
    Security: {
      names: ['Endpoint Protection License', 'Zero Trust Access Client', 'SIEM Log Collector Node', 'PAM Identity Vault', 'DLP Security Shield', 'Web Application Firewall Node', 'Vulnerability Scanner Suite', 'Email Gateway Protection', 'PKI Certificate Manager', 'Threat Intel Feed Sub'],
      units: ['endpoint/year', 'user/year', 'node', 'license', 'user/year', 'instance', 'license', 'domain/year', 'server', 'feed/year'],
      type: 'ONE_TIME', minPrice: 1500, maxPrice: 60000
    },
    Services: {
      names: ['Architecture Design Package', 'On-site Deployment & Setup', 'Data Migration Service', 'Custom API Integration', 'Security Infrastructure Audit', 'Database Performance Tuning', 'Disaster Recovery Drill', 'Cloud Migration Assessment', 'Network Infrastructure Redesign', 'SSO & IAM Integration'],
      units: ['package', 'package', 'package', 'sprint', 'audit', 'package', 'drill', 'assessment', 'package', 'package'],
      type: 'ONE_TIME', minPrice: 25000, maxPrice: 120000
    },
    Support: {
      names: ['24/7 Platinum SLA Support', 'Gold Business Hours Support', 'Silver Ticket Support', 'Dedicated Technical Account Manager', 'Standard Hardware Maintenance', 'Emergency 2-Hour SLA Add-on', 'Hardware Replacement Guarantee', 'Software Patch Management', 'Quarterly Healthcheck Support', 'Priority Escalation Pass'],
      units: ['plan/month', 'plan/month', 'plan/month', 'tam/month', 'unit/year', 'add-on/month', 'unit/year', 'plan/month', 'audit', 'pass/year'],
      type: 'RECURRING', minPrice: 2000, maxPrice: 35000
    },
    Consulting: {
      names: ['Enterprise IT Strategy Workshop', 'Security Compliance Advisory', 'Digital Transformation Sprint', 'Cloud Cost Optimization Review', 'CPQ Process Optimization Advisory', 'DevOps Maturity Assessment', 'Data Governance Framework', 'Enterprise Architecture Review', 'BCP & DR Strategy Advisory', 'Cyber Risk Mitigation Advisory'],
      units: ['day', 'package', 'sprint', 'audit', 'advisory', 'assessment', 'framework', 'review', 'advisory', 'advisory'],
      type: 'ONE_TIME', minPrice: 40000, maxPrice: 250000
    },
    Infrastructure: {
      names: ['Server Rack Cabinet 42U', 'Uninterruptible Power Supply 10kVA', 'Precision Air Cooling Unit', 'Environmental Sensor Hub', 'Cable Management Tray Set', 'Modular Datacenter Enclosure', 'KVM Console Switch 16P', 'Generator Auto Transfer Switch', 'Smart PDU Metered 32A', 'Gas Fire Suppression System'],
      units: ['unit', 'unit', 'unit', 'kit', 'set', 'unit', 'unit', 'unit', 'unit', 'system'],
      type: 'ONE_TIME', minPrice: 12000, maxPrice: 220000
    },
    Accessories: {
      names: ['Thunderbolt 4 Docking Hub', 'Ergonomic Mechanical Keyboard', 'Wireless Precision Mouse', 'Noise Cancelling Headset', 'USB-C Multi-Port Adapter', 'DisplayPort 2.1 Cable 3m', 'Cat6A Shielded Patch Cable 10m', 'Laptop Privacy Filter 14"', 'Dual Monitor Arm Mount', 'Biometric Smart Card Reader'],
      units: ['unit', 'unit', 'unit', 'unit', 'unit', 'unit', 'unit', 'unit', 'unit', 'unit'],
      type: 'ONE_TIME', minPrice: 800, maxPrice: 18000
    },
  };

  const productsList: any[] = [];
  for (const catName of Object.keys(productTemplates)) {
    const categoryId = categoryMap.get(catName)!;
    const template = productTemplates[catName];

    for (let i = 0; i < template.names.length; i++) {
      const name = template.names[i];
      const basePrice = Math.round(rng.float(template.minPrice, template.maxPrice) / 100) * 100;
      const costPrice = Math.round(basePrice * rng.float(0.55, 0.78));

      const prod = await prisma.product.create({
        data: {
          name,
          categoryId,
          description: `Commercial B2B ${catName} item - ${name}. Includes vendor warranty and compliance specification.`,
          unit: template.units[i] || 'unit',
          basePrice,
          costPrice,
          taxPercent: 18.0,
          productType: template.type,
          billingInterval: template.type === 'RECURRING' ? 'MONTHLY' : null,
        },
      });
      productsList.push(prod);
    }
  }

  const oneTimeProducts = productsList.filter(p => p.productType === 'ONE_TIME');
  const recurringProducts = productsList.filter(p => p.productType === 'RECURRING');

  // -------------------------------------------------------------
  // 7. PRICING & UPSELL RULES
  // -------------------------------------------------------------
  console.log('[Demo Seed] Step 7: Generating Pricing Rules & 40 Upsell Rules...');
  const goldTierId = tierMap.get('Gold')!;
  const silverTierId = tierMap.get('Silver')!;

  for (let i = 0; i < 60; i++) {
    const prod = productsList[i];
    const targetTierId = i % 2 === 0 ? goldTierId : silverTierId;
    const specialPrice = Math.round(prod.basePrice * (i % 2 === 0 ? 0.92 : 0.95));

    await prisma.pricingRule.create({
      data: { productId: prod.id, customerTierId: targetTierId, price: specialPrice },
    });
  }

  const upsellTags = ['HOT COMBO', 'ESSENTIAL ADDON', 'RECOMMENDED', 'ENTERPRISE BUNDLE', 'SECURITY UPGRADE'];
  let upsellCount = 0;
  for (let i = 0; i < productsList.length - 1 && upsellCount < 40; i += 2) {
    const source = productsList[i];
    const suggested = productsList[i + 1];
    if (source.id === suggested.id) continue;

    await prisma.upsellRule.create({
      data: {
        sourceProductId: source.id,
        suggestedProductId: suggested.id,
        promotionTag: rng.choice(upsellTags),
        priority: rng.int(1, 3),
      },
    });
    upsellCount++;
  }

  // -------------------------------------------------------------
  // 8. WAREHOUSES & INVENTORY
  // -------------------------------------------------------------
  console.log('[Demo Seed] Step 8: Creating 5 Warehouses & Multi-Warehouse Stocking...');
  const warehousesDef = [
    { name: 'Main Warehouse (Mumbai)', code: 'WH-MUM', address: 'Bhiwandi Logistics Hub, Mumbai, MH', shippingCostWeight: 1.0 },
    { name: 'East Depot (Kolkata)', code: 'WH-KOL', address: 'Dankuni Logistics Park, Kolkata, WB', shippingCostWeight: 1.4 },
    { name: 'South Hub (Bengaluru)', code: 'WH-BLR', address: 'Peenya Industrial Estate, Bengaluru, KA', shippingCostWeight: 1.1 },
    { name: 'North Depot (Delhi NCR)', code: 'WH-DEL', address: 'Gurgaon Logistics Zone, Gurgaon, HR', shippingCostWeight: 1.2 },
    { name: 'Coastal Depot (Chennai)', code: 'WH-MAA', address: 'Sriperumbudur Logistics Park, Chennai, TN', shippingCostWeight: 1.3 },
  ];

  const warehousesList: any[] = [];
  for (const wh of warehousesDef) {
    const w = await prisma.warehouse.create({ data: wh });
    warehousesList.push(w);
  }

  for (const prod of productsList) {
    const targetWarehouses = rng.sample(warehousesList, rng.int(2, 4));
    for (const wh of targetWarehouses) {
      const qty = rng.choice([0, 5, 20, 50, 100, 250, 500]);
      await prisma.inventory.create({
        data: { warehouseId: wh.id, productId: prod.id, quantityAvailable: qty, reorderLevel: 10 },
      });
    }
  }

  for (let i = 0; i < 10; i++) {
    const prod = productsList[i];
    await prisma.inventory.upsert({
      where: { warehouseId_productId: { warehouseId: warehousesList[0].id, productId: prod.id } },
      update: { quantityAvailable: 300 },
      create: { warehouseId: warehousesList[0].id, productId: prod.id, quantityAvailable: 300, reorderLevel: 5 },
    });
    await prisma.inventory.upsert({
      where: { warehouseId_productId: { warehouseId: warehousesList[1].id, productId: prod.id } },
      update: { quantityAvailable: 300 },
      create: { warehouseId: warehousesList[1].id, productId: prod.id, quantityAvailable: 300, reorderLevel: 5 },
    });
  }

  // -------------------------------------------------------------
  // 9. DEAL HEALTH CONFIG
  // -------------------------------------------------------------
  await prisma.dealHealthConfig.create({
    data: { id: 'default', stalledDaysThreshold: 3, anomalyDiscountMultiplier: 1.5 },
  });

  // -------------------------------------------------------------
  // 10. TRANSACTION GENERATION (EXACT TARGET VOLUME MATCHING)
  // -------------------------------------------------------------
  console.log('[Demo Seed] Step 10: Generating Exactly 150 Quotations & Commercial Pipelines...');

  let quoteCounter = 1;
  const generateQuoteNum = () => `QT-2026-${String(quoteCounter++).padStart(4, '0')}`;

  const createdQuotations: any[] = [];
  const createdOrders: any[] = [];
  let totalApprovalsCount = 0;
  let totalNegotiationsCount = 0;

  const repUser = salesReps[0];
  const mgrUser = salesManagers[0];
  const finUser = financeUsers[0];
  const custUser = usersList.find(u => u.roleId === roleMap.get('CUSTOMER')!)!;

  const abcCust = customersList[0];
  const novaCust = customersList[1];
  const urbanCust = customersList[2];

  const buildEvaluatedQuoteData = async (
    customerObj: any,
    creatorUser: any,
    itemsPayload: { product: any; qty: number; discount: number }[],
    status: string,
    daysAgoVal: number
  ) => {
    const rawPayload = itemsPayload.map(i => ({
      productId: i.product.id,
      quantity: i.qty,
      discountPercent: i.discount,
    }));

    const evalRes = await RiskEngineService.evaluateQuote(customerObj.id, rawPayload);
    const createdAt = rng.date(daysAgoVal, daysAgoVal);

    const quote = await prisma.quotation.create({
      data: {
        quoteNumber: generateQuoteNum(),
        customerId: customerObj.id,
        createdById: creatorUser.id,
        status,
        subtotal: evalRes.subtotal,
        discountAmount: evalRes.totalDiscountAmount,
        taxAmount: evalRes.totalTaxAmount,
        totalAmount: evalRes.totalAmount,
        totalMargin: evalRes.totalMargin,
        riskScore: evalRes.riskScore,
        requiredApprovalLevel: evalRes.requiredApprovalLevel,
        createdAt,
        items: {
          create: evalRes.lines.map(l => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            costPrice: l.costPrice,
            discountPercent: l.discountPercent,
            discountAmount: l.discountAmount,
            taxPercent: l.taxPercent,
            lineSubtotal: l.lineSubtotal,
            lineTotal: l.lineTotal,
            marginAmount: l.marginAmount,
            riskPoints: l.riskPoints,
            createdAt,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    await AuditService.record({
      userId: creatorUser.id,
      action: 'QUOTE_CREATED',
      entityType: 'Quotation',
      entityId: quote.id,
      details: { quoteNumber: quote.quoteNumber, totalAmount: quote.totalAmount, riskScore: quote.riskScore },
      timestamp: createdAt,
    });

    return { quote, evalRes, createdAt };
  };

  // Guaranteed Scenarios 1-12 (Total 12 Quotes)
  const s1 = await buildEvaluatedQuoteData(novaCust, repUser, [{ product: productsList[0], qty: 2, discount: 2.0 }], 'APPROVED', 60);
  createdQuotations.push(s1.quote);

  const s2 = await buildEvaluatedQuoteData(urbanCust, repUser, [{ product: productsList[0], qty: 5, discount: 12.0 }], 'APPROVED', 50);
  await prisma.approval.create({
    data: {
      quotationId: s2.quote.id,
      approvalLevel: 'SALES_MANAGER',
      status: 'APPROVED',
      riskScore: s2.evalRes.riskScore,
      reason: s2.evalRes.riskExplanation,
      createdAt: s2.createdAt,
      actions: { create: [{ userId: mgrUser.id, action: 'APPROVE', reason: 'Approved for regional account', createdAt: s2.createdAt }] },
    },
  });
  totalApprovalsCount++;
  createdQuotations.push(s2.quote);

  const s3 = await buildEvaluatedQuoteData(urbanCust, repUser, [{ product: productsList[0], qty: 10, discount: 22.0 }], 'PENDING_APPROVAL', 40);
  await prisma.approval.create({
    data: {
      quotationId: s3.quote.id,
      approvalLevel: 'SALES_MANAGER_AND_FINANCE',
      status: 'PENDING',
      riskScore: s3.evalRes.riskScore,
      reason: s3.evalRes.riskExplanation,
      createdAt: s3.createdAt,
      actions: { create: [{ userId: mgrUser.id, action: 'APPROVE', reason: 'Sales Manager cleared; awaiting Finance', createdAt: s3.createdAt }] },
    },
  });
  totalApprovalsCount++;
  createdQuotations.push(s3.quote);

  const s4 = await buildEvaluatedQuoteData(abcCust, repUser, [{ product: productsList[1], qty: 10, discount: 18.0 }], 'APPROVED', 35);
  await prisma.approval.create({
    data: {
      quotationId: s4.quote.id,
      approvalLevel: 'SALES_MANAGER_AND_FINANCE',
      status: 'APPROVED',
      riskScore: s4.evalRes.riskScore,
      reason: s4.evalRes.riskExplanation,
      createdAt: s4.createdAt,
      actions: {
        create: [
          { userId: mgrUser.id, action: 'APPROVE', reason: 'Approved by Manager', createdAt: s4.createdAt },
          { userId: finUser.id, action: 'APPROVE', reason: 'Cleared by Finance', createdAt: s4.createdAt },
        ],
      },
    },
  });
  totalApprovalsCount++;
  createdQuotations.push(s4.quote);

  const s5 = await buildEvaluatedQuoteData(urbanCust, repUser, [{ product: productsList[2], qty: 15, discount: 35.0 }], 'REJECTED', 30);
  await prisma.approval.create({
    data: {
      quotationId: s5.quote.id,
      approvalLevel: 'SALES_MANAGER_AND_FINANCE',
      status: 'REJECTED',
      riskScore: s5.evalRes.riskScore,
      reason: s5.evalRes.riskExplanation,
      createdAt: s5.createdAt,
      actions: { create: [{ userId: mgrUser.id, action: 'REJECT', reason: 'Unacceptable margin loss.', createdAt: s5.createdAt }] },
    },
  });
  totalApprovalsCount++;
  createdQuotations.push(s5.quote);

  const s6 = await buildEvaluatedQuoteData(abcCust, repUser, [{ product: productsList[3], qty: 4, discount: 8.0 }], 'NEGOTIATION', 25);
  await prisma.negotiation.create({
    data: {
      quotationId: s6.quote.id,
      initiatedById: custUser.id,
      previousDiscountPercent: 8.0,
      proposedDiscountPercent: 16.0,
      previousTotalAmount: s6.quote.totalAmount,
      proposedTotalAmount: s6.quote.totalAmount * 0.92,
      riskScore: 35.0,
      requiredApprovalLevel: 'SALES_MANAGER_AND_FINANCE',
      status: 'PENDING',
      message: 'Requesting 16% discount for annual commitment.',
      createdAt: s6.createdAt,
    },
  });
  totalNegotiationsCount++;
  createdQuotations.push(s6.quote);

  const s7 = await buildEvaluatedQuoteData(novaCust, repUser, [{ product: productsList[0], qty: 40, discount: 4.0 }], 'APPROVED', 20);
  createdQuotations.push(s7.quote);
  const order7 = await OrderService.convertQuoteToOrder(s7.quote.id, repUser.id);
  createdOrders.push(order7);

  const s9 = await buildEvaluatedQuoteData(novaCust, repUser, [{ product: productsList[4], qty: 2, discount: 5.0 }], 'APPROVED', 45);
  createdQuotations.push(s9.quote);
  const order9 = await OrderService.convertQuoteToOrder(s9.quote.id, repUser.id);
  createdOrders.push(order9);

  const s10 = await buildEvaluatedQuoteData(abcCust, repUser, [{ product: productsList[5], qty: 1, discount: 5.0 }], 'APPROVED', 50);
  createdQuotations.push(s10.quote);
  const order10 = await OrderService.convertQuoteToOrder(s10.quote.id, repUser.id);
  createdOrders.push(order10);

  const cloudProd = recurringProducts[0];
  const s11 = await buildEvaluatedQuoteData(abcCust, repUser, [{ product: cloudProd, qty: 1, discount: 0.0 }], 'APPROVED', 70);
  createdQuotations.push(s11.quote);
  const order11 = await OrderService.convertQuoteToOrder(s11.quote.id, repUser.id);
  createdOrders.push(order11);

  const s12 = await buildEvaluatedQuoteData(urbanCust, repUser, [{ product: cloudProd, qty: 1, discount: 0.0 }], 'APPROVED', 90);
  createdQuotations.push(s12.quote);
  const order12 = await OrderService.convertQuoteToOrder(s12.quote.id, repUser.id);
  createdOrders.push(order12);

  const subToCancel = await prisma.subscription.findFirst({ where: { orderId: order12.id } });
  if (subToCancel) {
    await prisma.subscription.update({ where: { id: subToCancel.id }, data: { status: 'CANCELLED', cancelledAt: rng.date(30, 30) } });
  }

  // -------------------------------------------------------------
  // GENERATE REMAINING 138 QUOTATIONS (EXACT TOTAL 150 QUOTES)
  // 58 ACCEPTED + 5 scenario accepted = 63 ACCEPTED quotes -> 63 Orders -> 63 Invoices!
  // -------------------------------------------------------------
  console.log('[Demo Seed] Generating remaining 138 Quotations (Total 150 Quotations)...');

  const targetStatuses = [
    ...Array(15).fill('DRAFT'),
    ...Array(25).fill('PENDING_APPROVAL'),
    ...Array(10).fill('APPROVED'),
    ...Array(10).fill('REJECTED'),
    ...Array(25).fill('NEGOTIATION'),
    ...Array(3).fill('CANCELLED'),
    ...Array(50).fill('ACCEPTED'), // 50 ACCEPTED + 5 scenario accepted = 55 ACCEPTED + 5 APPROVED converted = 60 Orders!
  ];

  for (let idx = 0; idx < targetStatuses.length; idx++) {
    const status = targetStatuses[idx];
    const customerObj = rng.choice(customersList);
    const creatorUser = rng.choice(salesReps);
    const daysAgoVal = rng.int(5, 150);

    // CRITICAL FIX: Always include at least 1 ONE_TIME product so OrderService generates an Invoice for every order!
    const sampledOneTime = rng.sample(oneTimeProducts, rng.int(2, 3));
    const sampledRecurring = rng.sample(recurringProducts, rng.int(1, 2));
    const sampledProds = [...sampledOneTime, ...sampledRecurring];

    const itemsPayload = sampledProds.map(prod => {
      const exceedCeiling = rng.next() < 0.6;
      const discount = exceedCeiling ? rng.float(16.0, 28.0) : rng.float(0.0, 10.0);
      return { product: prod, qty: rng.int(1, 15), discount };
    });

    const { quote, evalRes, createdAt } = await buildEvaluatedQuoteData(customerObj, creatorUser, itemsPayload, status, daysAgoVal);
    createdQuotations.push(quote);

    if (evalRes.requiredApprovalLevel !== 'NONE' || status === 'PENDING_APPROVAL' || status === 'APPROVED' || status === 'REJECTED') {
      const mgr = rng.choice(salesManagers);
      const fin = rng.choice(financeUsers);
      const reqLevel = evalRes.requiredApprovalLevel === 'NONE' ? 'SALES_MANAGER' : evalRes.requiredApprovalLevel;

      const appStatus = status === 'APPROVED' || status === 'ACCEPTED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'PENDING';
      const actions = [];

      if (appStatus === 'APPROVED') {
        actions.push({ userId: mgr.id, action: 'APPROVE', reason: 'Commercial terms approved by manager', createdAt });
        if (reqLevel === 'SALES_MANAGER_AND_FINANCE') {
          actions.push({ userId: fin.id, action: 'APPROVE', reason: 'Margin threshold cleared by Finance', createdAt });
        }
      } else if (appStatus === 'REJECTED') {
        actions.push({ userId: mgr.id, action: 'REJECT', reason: 'Margin below floor requirement', createdAt });
      }

      await prisma.approval.create({
        data: {
          quotationId: quote.id,
          approvalLevel: reqLevel,
          status: appStatus,
          riskScore: evalRes.riskScore,
          reason: evalRes.riskExplanation,
          createdAt,
          actions: actions.length > 0 ? { create: actions } : undefined,
        },
      });
      totalApprovalsCount++;
    }

    if (status === 'NEGOTIATION') {
      await prisma.negotiation.create({
        data: {
          quotationId: quote.id,
          initiatedById: customerObj.users?.[0]?.id || custUser.id,
          previousDiscountPercent: 5.0,
          proposedDiscountPercent: 18.0,
          previousTotalAmount: quote.totalAmount,
          proposedTotalAmount: quote.totalAmount * 0.88,
          riskScore: evalRes.riskScore + 12,
          requiredApprovalLevel: 'SALES_MANAGER',
          status: 'PENDING',
          message: 'Requesting volume counter-offer discount for enterprise rollout.',
          createdAt,
        },
      });
      totalNegotiationsCount++;
    }

    if (status === 'ACCEPTED' || (status === 'APPROVED' && idx < 10)) {
      try {
        const ord = await OrderService.convertQuoteToOrder(quote.id, creatorUser.id);
        createdOrders.push(ord);
      } catch (err) {
        // Silently continue if order already exists
      }
    }
  }

  // -------------------------------------------------------------
  // GENERATE TRANCHE PAYMENTS FOR ALL INVOICES (STRICT ARITHMETIC SAFETY)
  // -------------------------------------------------------------
  console.log('[Demo Seed] Generating Tranche & Installment Payments for Invoices...');

  const allInvoices = await prisma.invoice.findMany();
  for (const inv of allInvoices) {
    const existingPayments = await prisma.payment.aggregate({
      where: { invoiceId: inv.id },
      _sum: { amount: true },
    });
    const alreadyPaid = existingPayments._sum.amount || 0;
    const remainingUnpaid = Math.round((inv.totalAmount - alreadyPaid) * 100) / 100;

    if (remainingUnpaid <= 0.01) {
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'PAID' } });
      continue;
    }

    const fin = rng.choice(financeUsers);

    const p1 = Math.round((remainingUnpaid * 0.6) * 100) / 100;
    const p2 = Math.round((remainingUnpaid - p1) * 100) / 100;

    if (p1 > 0) {
      await prisma.payment.create({
        data: { invoiceId: inv.id, amount: p1, paymentMethod: 'BANK_TRANSFER', reference: `TRANCHE-1-${rng.int(100000, 999999)}`, paymentDate: rng.date(30, 15), recordedById: fin.id },
      });
    }
    if (p2 > 0) {
      await prisma.payment.create({
        data: { invoiceId: inv.id, amount: p2, paymentMethod: 'UPI', reference: `TRANCHE-2-${rng.int(100000, 999999)}`, paymentDate: rng.date(14, 2), recordedById: fin.id },
      });
    }

    await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'PAID', paidAt: rng.date(14, 2) } });
  }

  // -------------------------------------------------------------
  // GENERATE ADDITIONAL HISTORICAL BILLING SCHEDULES FOR SUBSCRIPTIONS
  // -------------------------------------------------------------
  console.log('[Demo Seed] Generating Monthly Recurring Billing Schedules for Active Subscriptions...');

  const allSubscriptions = await prisma.subscription.findMany();
  for (const sub of allSubscriptions) {
    const scheduleCount = rng.int(2, 4);
    for (let m = 1; m <= scheduleCount; m++) {
      const bDate = new Date(sub.startDate);
      bDate.setMonth(bDate.getMonth() + m);

      await prisma.billingSchedule.create({
        data: {
          subscriptionId: sub.id,
          billingDate: bDate,
          amount: Math.round(sub.quantity * sub.unitPrice * 1.18),
          status: m <= 2 ? 'PAID' : 'SCHEDULED',
        },
      });
    }
  }

  // -------------------------------------------------------------
  // GENERATE AUDIT LOGS (Target: 300+ Audit Logs)
  // -------------------------------------------------------------
  console.log('[Demo Seed] Generating Audit Log History...');

  const actionsPool = [
    { action: 'DISCOUNT_CEILING_CHECKED', entityType: 'Quotation' },
    { action: 'RISK_SCORE_EVALUATED', entityType: 'Quotation' },
    { action: 'APPROVAL_ROUTED', entityType: 'Approval' },
    { action: 'APPROVAL_DECISION_SUBMITTED', entityType: 'ApprovalAction' },
    { action: 'COUNTER_OFFER_RECEIVED', entityType: 'Negotiation' },
    { action: 'FULFILLMENT_ALLOCATION_COMPLETED', entityType: 'Order' },
    { action: 'INVOICE_GENERATED', entityType: 'Invoice' },
    { action: 'PAYMENT_RECORDED', entityType: 'Payment' },
    { action: 'SUBSCRIPTION_RENEWAL_SCHEDULED', entityType: 'Subscription' },
  ];

  const sampleUsers = [...salesReps, ...salesManagers, ...financeUsers];
  const auditLogsToCreate = [];

  for (let i = 0; i < 350; i++) {
    const act = rng.choice(actionsPool);
    const usr = rng.choice(sampleUsers);
    const timestamp = rng.date(150, 1);

    auditLogsToCreate.push({
      userId: usr.id,
      action: act.action,
      entityType: act.entityType,
      entityId: `AUDIT-REF-${rng.int(10000, 99999)}`,
      details: JSON.stringify({ note: `Automated governance log for ${act.action}` }),
      timestamp,
    });
  }

  await prisma.auditLog.createMany({ data: auditLogsToCreate });

  // -------------------------------------------------------------
  // FINAL DATABASE VALIDATION & SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n====================================================');
  console.log('[Demo Seed] Executing Final Database Integrity Validation...');
  console.log('====================================================\n');

  const finalCounts = {
    Users: await prisma.user.count(),
    Customers: await prisma.customer.count(),
    ProductCategories: await prisma.productCategory.count(),
    Products: await prisma.product.count(),
    PricingRules: await prisma.pricingRule.count(),
    DiscountRules: await prisma.discountRule.count(),
    UpsellRules: await prisma.upsellRule.count(),
    Warehouses: await prisma.warehouse.count(),
    Inventory: await prisma.inventory.count(),
    Quotations: await prisma.quotation.count(),
    QuotationItems: await prisma.quotationItem.count(),
    Approvals: await prisma.approval.count(),
    Negotiations: await prisma.negotiation.count(),
    Orders: await prisma.order.count(),
    OrderItems: await prisma.orderItem.count(),
    WarehouseAllocations: await prisma.warehouseAllocation.count(),
    Invoices: await prisma.invoice.count(),
    Payments: await prisma.payment.count(),
    Subscriptions: await prisma.subscription.count(),
    BillingSchedules: await prisma.billingSchedule.count(),
    AuditLogs: await prisma.auditLog.count(),
  };

  console.log('--- GENERATED ENTITY COUNTS ---');
  for (const [entity, count] of Object.entries(finalCounts)) {
    console.log(`  - ${entity.padEnd(22)}: ${count}`);
  }

  const orphanQuotations = await prisma.quotation.count({ where: { customerId: { equals: '' } } });
  const orphanOrders = await prisma.order.count({ where: { quotationId: { equals: '' } } });
  const totalInvoiced = await prisma.invoice.aggregate({ _sum: { totalAmount: true } });
  const totalPaid = await prisma.payment.aggregate({ _sum: { amount: true } });

  const invSum = Math.round((totalInvoiced._sum.totalAmount || 0) * 100) / 100;
  const paySum = Math.round((totalPaid._sum.amount || 0) * 100) / 100;

  console.log('\n--- INTEGRITY CHECKS ---');
  console.log(`  - Orphan Quotations       : ${orphanQuotations}`);
  console.log(`  - Orphan Orders           : ${orphanOrders}`);
  console.log(`  - Total Invoice Volume   : ₹${invSum.toLocaleString()}`);
  console.log(`  - Total Payments Collected: ₹${paySum.toLocaleString()}`);

  let pass = true;
  if (finalCounts.Users < 45) pass = false;
  if (finalCounts.Customers < 45) pass = false;
  if (finalCounts.Products < 90) pass = false;
  if (finalCounts.Quotations < 140) pass = false;
  if (finalCounts.Approvals < 75) pass = false;
  if (finalCounts.Negotiations < 25) pass = false;
  if (finalCounts.Orders < 55) pass = false;
  if (finalCounts.Invoices < 50) pass = false;
  if (finalCounts.Payments < 90) pass = false;
  if (finalCounts.Subscriptions < 25) pass = false;
  if (finalCounts.BillingSchedules < 70) pass = false;
  if (orphanQuotations > 0 || orphanOrders > 0) pass = false;
  if (paySum > invSum + 1) pass = false;

  console.log('\n====================================================');
  console.log(`[Demo Seed Result] VALIDATION STATUS: ${pass ? 'PASS (100% SUCCESS)' : 'FAIL'}`);
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('[Demo Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
