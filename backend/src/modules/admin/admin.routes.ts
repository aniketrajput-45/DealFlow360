import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  getAdminStats,
  getUsers,
  updateUserRole,
  getPricingRules,
  getDiscountGovernance,
  getUpsellRules,
} from './admin.controller';

const router = Router();

// Protect all admin routes with requireAuth and requireRole(['ADMIN'])
router.use(requireAuth, requireRole(['ADMIN']));

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.get('/pricing-rules', getPricingRules);
router.get('/discount-governance', getDiscountGovernance);
router.get('/upsell-rules', getUpsellRules);

export default router;
