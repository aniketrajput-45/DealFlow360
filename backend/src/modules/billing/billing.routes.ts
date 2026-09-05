import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  recordPayment,
  getSubscriptions,
  cancelSubscription,
} from './billing.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

// Invoices
router.get('/invoices', requireAuth, getInvoices);
router.get('/invoices/:id', requireAuth, getInvoiceById);
router.post('/payments', requireAuth, requireRole(['ADMIN', 'FINANCE', 'SALES_MANAGER']), recordPayment);

// Subscriptions
router.get('/subscriptions', requireAuth, getSubscriptions);
router.post('/subscriptions/:id/cancel', requireAuth, requireRole(['ADMIN', 'FINANCE']), cancelSubscription);

export default router;
