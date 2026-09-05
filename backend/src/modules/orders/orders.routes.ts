import { Router } from 'express';
import { convertQuote, getOrders, getOrderById } from './orders.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, getOrders);
router.post('/convert', requireAuth, requireRole(['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE', 'CUSTOMER']), convertQuote);
router.get('/:id', requireAuth, getOrderById);

export default router;
