import { Router } from 'express';
import { convertQuote, getOrders, getOrderById } from './orders.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, getOrders);
router.post('/convert', requireAuth, convertQuote);
router.get('/:id', requireAuth, getOrderById);

export default router;
