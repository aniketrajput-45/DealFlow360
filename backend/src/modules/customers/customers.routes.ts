import { Router } from 'express';
import { getCustomers, getTiers, getCustomerById } from './customers.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, requireRole(['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']), getCustomers);
router.get('/tiers', requireAuth, getTiers);
router.get('/:id', requireAuth, requireRole(['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']), getCustomerById);

export default router;
