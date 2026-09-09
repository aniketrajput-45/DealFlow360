import { Router } from 'express';
import { getCustomers, createCustomer, getTiers, getCustomerById, getCustomerGrowthOpportunities, getMyQuotationRecommendations } from './customers.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/my-recommendations', requireAuth, requireRole(['CUSTOMER']), getMyQuotationRecommendations);
router.get('/', requireAuth, requireRole(['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']), getCustomers);
router.post('/', requireAuth, requireRole(['ADMIN', 'SALES_REP']), createCustomer);
router.get('/tiers', requireAuth, getTiers);
router.get('/:id', requireAuth, requireRole(['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']), getCustomerById);
router.get('/:id/growth-opportunities', requireAuth, getCustomerGrowthOpportunities);

export default router;
