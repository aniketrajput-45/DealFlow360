import { Router } from 'express';
import { getProducts, getCategories, getUpsellSuggestions, createProduct, updateProduct } from './products.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

// Internal & customer quotation views require authenticated access
router.get('/', requireAuth, getProducts);
router.get('/categories', requireAuth, getCategories);
router.get('/upsell/:productId', requireAuth, getUpsellSuggestions);

// Admin operations
router.post('/', requireAuth, requireRole(['ADMIN']), createProduct);
router.put('/:id', requireAuth, requireRole(['ADMIN']), updateProduct);

export default router;
