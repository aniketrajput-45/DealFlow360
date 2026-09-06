import { Request, Response } from 'express';
import { ReportingService } from './reporting.service';
import { AuditService } from '../audit/audit.service';
import { prisma } from '../../config/prisma';

export const getDealHealthAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await ReportingService.getDealHealthAndAlerts(req.user);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch deal health alerts.' });
  }
};

export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const overview = await ReportingService.getSalesOverview(req.user);
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

    if (actionType === 'ESCALATE_TO_FINANCE') {
      const approval = await prisma.approval.findFirst({
        where: { quotationId: quoteId, status: 'PENDING' },
        include: { actions: { include: { user: { include: { role: true } } } } },
      });

      if (approval) {
        const hasManagerAction = approval.actions.some(
          (a: any) => a.user?.role?.name === 'SALES_MANAGER' || a.user?.role?.name === 'ADMIN'
        );

        if (!hasManagerAction && userId) {
          await prisma.approvalAction.create({
            data: {
              approvalId: approval.id,
              userId,
              action: 'APPROVE',
              reason: notes || 'Sales Manager escalated deal to Finance from Deal Health',
            },
          });
        }

        // Touch approval updatedAt to trigger timestamp refresh
        await prisma.approval.update({
          where: { id: approval.id },
          data: { updatedAt: new Date() },
        });
      }
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
