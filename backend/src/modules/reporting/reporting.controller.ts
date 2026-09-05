import { Request, Response } from 'express';
import { ReportingService } from './reporting.service';
import { AuditService } from '../audit/audit.service';

export const getDealHealthAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await ReportingService.getDealHealthAndAlerts();
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch deal health alerts.' });
  }
};

export const getDashboardOverview = async (_req: Request, res: Response): Promise<void> => {
  try {
    const overview = await ReportingService.getSalesOverview();
    res.json(overview);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch sales overview.' });
  }
};

export const triggerDealNudge = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quoteId, actionType = 'NUDGE_REP', notes } = req.body;
    const userId = req.user?.id;

    if (!quoteId) {
      res.status(400).json({ error: 'quoteId is required.' });
      return;
    }

    await AuditService.record({
      userId,
      action: `ALERT_TRIGGERED_${actionType}`,
      entityType: 'Quotation',
      entityId: quoteId,
      details: { notes },
    });

    res.json({
      message: `Automated alert action '${actionType}' triggered successfully.`,
      quoteId,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to trigger alert action.' });
  }
};
