import { Router } from 'express';
import {
  getDealHealthAlerts,
  getDashboardOverview,
  triggerDealNudge,
} from './reporting.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/health', requireAuth, requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP']), getDealHealthAlerts);
router.get('/overview', requireAuth, getDashboardOverview);
router.post('/nudge', requireAuth, requireRole(['ADMIN', 'SALES_MANAGER']), triggerDealNudge);

export default router;
