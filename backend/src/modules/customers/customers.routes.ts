import { Router } from 'express';
import { getCustomers, getTiers, getCustomerById } from './customers.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, getCustomers);
router.get('/tiers', requireAuth, getTiers);
router.get('/:id', requireAuth, getCustomerById);

export default router;
