import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { AuditService } from './audit.service';

const router = Router();

router.get('/', requireAuth, requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE']), async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, limit } = req.query;
    const logs = await AuditService.getLogs({
      entityType: entityType as string,
      entityId: entityId as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch audit logs.' });
  }
});

export default router;
