import { Router } from 'express';
import { getProducts, getCategories, getUpsellSuggestions } from './products.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Internal & customer quotation views require authenticated access
router.get('/', requireAuth, getProducts);
router.get('/categories', requireAuth, getCategories);
router.get('/upsell/:productId', requireAuth, getUpsellSuggestions);

export default router;
