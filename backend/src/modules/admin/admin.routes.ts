import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  getAdminStats,
  getUsers,
  createUser,
  updateUserRole,
  getPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  getDiscountGovernance,
  updateCustomerTierCeiling,
  updateCategoryDiscountRule,
  getUpsellRules,
  createUpsellRule,
  updateUpsellRule,
  deleteUpsellRule,
} from './admin.controller';

const router = Router();

// Protect all admin routes with requireAuth and requireRole(['ADMIN'])
router.use(requireAuth, requireRole(['ADMIN']));

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id/role', updateUserRole);

router.get('/pricing-rules', getPricingRules);
router.post('/pricing-rules', createPricingRule);
router.put('/pricing-rules/:id', updatePricingRule);
router.delete('/pricing-rules/:id', deletePricingRule);

router.get('/discount-governance', getDiscountGovernance);
router.put('/discount-governance/tier/:id', updateCustomerTierCeiling);
router.put('/discount-governance/category/:id', updateCategoryDiscountRule);

router.get('/upsell-rules', getUpsellRules);
router.post('/upsell-rules', createUpsellRule);
router.put('/upsell-rules/:id', updateUpsellRule);
router.delete('/upsell-rules/:id', deleteUpsellRule);

export default router;
