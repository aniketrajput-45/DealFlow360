import { Router } from 'express';
import { getPendingApprovals, takeApprovalAction } from './approvals.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

// Approvals can be viewed by managers, finance, and admins
router.get('/', requireAuth, requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE']), getPendingApprovals);
router.post('/:id/action', requireAuth, requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE']), takeApprovalAction);

export default router;
