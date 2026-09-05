import { Router } from 'express';
import {
  previewAllocation,
  allocateOrderFulfillment,
  getWarehousesWithInventory,
} from './fulfillment.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.post('/preview', requireAuth, previewAllocation);
router.post('/allocate', requireAuth, requireRole(['ADMIN', 'WAREHOUSE', 'FINANCE', 'SALES_MANAGER']), allocateOrderFulfillment);
router.get('/warehouses', requireAuth, getWarehousesWithInventory);

export default router;
