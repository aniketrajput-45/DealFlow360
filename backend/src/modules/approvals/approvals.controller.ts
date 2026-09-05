import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { AuditService } from '../audit/audit.service';

export const getPendingApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const { status = 'PENDING' } = req.query;

    const approvals = await prisma.approval.findMany({
      where: {
        ...(status ? { status: status as string } : {}),
      },
      include: {
        quotation: {
          include: {
            customer: { select: { id: true, companyName: true, tier: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            items: { include: { product: true } },
          },
        },
        actions: {
          include: {
            user: { select: { id: true, name: true, role: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Tag each approval with whether the current user is eligible to act on it
    const enhanced = approvals.map((a) => {
      let canAct = false;
      if (userRole === 'ADMIN') {
        canAct = a.status === 'PENDING';
      } else if (userRole === 'SALES_MANAGER') {
        // Sales Manager can act if approval is SALES_MANAGER, or first step of SALES_MANAGER_AND_FINANCE
        canAct = a.status === 'PENDING' && (a.approvalLevel === 'SALES_MANAGER' || a.actions.length === 0);
      } else if (userRole === 'FINANCE') {
        // Finance can act if approvalLevel is FINANCE or if Manager has already approved first step
        const managerHasApproved = a.actions.some((act) => act.action === 'APPROVE');
        canAct = a.status === 'PENDING' && (a.approvalLevel === 'FINANCE' || (a.approvalLevel === 'SALES_MANAGER_AND_FINANCE' && managerHasApproved));
      }

      return {
        ...a,
        canAct,
      };
    });

    res.json(enhanced);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch approvals.' });
  }
};

export const takeApprovalAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!['APPROVE', 'REJECT', 'REQUEST_CHANGES'].includes(action)) {
      res.status(400).json({ error: 'Invalid action. Must be APPROVE, REJECT, or REQUEST_CHANGES.' });
      return;
    }
    if (action !== 'APPROVE' && !reason) {
      res.status(400).json({ error: 'A reason is required when rejecting or requesting changes.' });
      return;
    }

    const approval = await prisma.approval.findUnique({
      where: { id },
      include: {
        quotation: true,
        actions: { include: { user: { include: { role: true } } } },
      },
    });

    if (!approval) {
      res.status(404).json({ error: 'Approval record not found.' });
      return;
    }
    if (approval.status !== 'PENDING') {
      res.status(400).json({ error: `Approval is already closed with status: ${approval.status}` });
      return;
    }

    // Role eligibility check
    if (userRole === 'SALES_REP' || userRole === 'CUSTOMER') {
      res.status(403).json({ error: 'Only Sales Managers, Finance users, or Admins can act on approvals.' });
      return;
    }

    // Handle 2-step workflow for SALES_MANAGER_AND_FINANCE
    const previousActions = approval.actions;
    const managerApproved = previousActions.some((a) => a.action === 'APPROVE');

    if (approval.approvalLevel === 'SALES_MANAGER_AND_FINANCE') {
      if (userRole === 'FINANCE' && !managerApproved) {
        res.status(400).json({ error: 'Sales Manager must review and approve this quotation before Finance approval.' });
        return;
      }
    }

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Record the action
      const newAction = await tx.approvalAction.create({
        data: {
          approvalId: id,
          userId,
          action,
          reason: reason || null,
        },
      });

      let updatedApprovalStatus = approval.status;
      let updatedQuoteStatus = approval.quotation.status;

      if (action === 'REJECT') {
        updatedApprovalStatus = 'REJECTED';
        updatedQuoteStatus = 'REJECTED';
      } else if (action === 'REQUEST_CHANGES') {
        updatedApprovalStatus = 'REJECTED';
        updatedQuoteStatus = 'DRAFT'; // Returns quote back to draft for rep revision
      } else if (action === 'APPROVE') {
        if (approval.approvalLevel === 'SALES_MANAGER_AND_FINANCE') {
          if (managerApproved || userRole === 'FINANCE' || userRole === 'ADMIN') {
            // Both manager and finance have now approved (or Admin overrode)
            updatedApprovalStatus = 'APPROVED';
            updatedQuoteStatus = 'APPROVED';
          } else {
            // Manager approved first step; remains PENDING for Finance
            updatedApprovalStatus = 'PENDING';
            updatedQuoteStatus = 'PENDING_APPROVAL';
          }
        } else {
          // Single-step approval completed
          updatedApprovalStatus = 'APPROVED';
          updatedQuoteStatus = 'APPROVED';
        }
      }

      await tx.approval.update({
        where: { id },
        data: { status: updatedApprovalStatus },
      });

      await tx.quotation.update({
        where: { id: approval.quotationId },
        data: { status: updatedQuoteStatus },
      });

      return { newAction, updatedApprovalStatus, updatedQuoteStatus };
    });

    // 2. Append to immutable AuditLog
    await AuditService.record({
      userId,
      action: `APPROVAL_${action}`,
      entityType: 'Approval',
      entityId: id,
      details: {
        quotationId: approval.quotationId,
        quoteNumber: approval.quotation.quoteNumber,
        action,
        reason,
        resultingApprovalStatus: result.updatedApprovalStatus,
        resultingQuoteStatus: result.updatedQuoteStatus,
      },
    });

    res.json({
      message: `Approval action '${action}' recorded successfully.`,
      approvalStatus: result.updatedApprovalStatus,
      quotationStatus: result.updatedQuoteStatus,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process approval action.' });
  }
};
