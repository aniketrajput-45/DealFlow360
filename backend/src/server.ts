import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './modules/auth/auth.routes';
import productsRouter from './modules/products/products.routes';
import customersRouter from './modules/customers/customers.routes';
import quotationsRouter from './modules/quotations/quotations.routes';
import approvalsRouter from './modules/approvals/approvals.routes';
import ordersRouter from './modules/orders/orders.routes';
import fulfillmentRouter from './modules/fulfillment/fulfillment.routes';
import billingRouter from './modules/billing/billing.routes';
import negotiationsRouter from './modules/negotiations/negotiations.routes';
import reportingRouter from './modules/reporting/reporting.routes';
import auditRouter from './modules/audit/audit.routes';
import adminRouter from './modules/admin/admin.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// API Domain Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/quotes', quotationsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/fulfillment', fulfillmentRouter);
app.use('/api/billing', billingRouter);
app.use('/api/negotiations', negotiationsRouter);
app.use('/api/reporting', reportingRouter);
app.use('/api/audit', auditRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'DealFlow360 API',
    database: 'SQLite (Prisma)',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[DealFlow360 API] Server running on port ${PORT}`);
});

export default app;
