import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { AuditService } from '../audit/audit.service';

export const getPendingApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const { status } = req.query;

    const statusFilter = status && status !== 'ALL' ? { status: status as string } : {};

    const approvals = await prisma.approval.findMany({
      where: statusFilter,
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
      orderBy: { updatedAt: 'desc' },
    });

    // Tag each approval with whether the current user is eligible to act on it, and filter for role relevance
    const enhanced = approvals
      .map((a) => {
        let canAct = false;
        const managerAction = a.actions.find((act) => {
          const roleName = act.user?.role?.name;
          return roleName === 'SALES_MANAGER' || roleName === 'ADMIN';
        });
        const managerApproved = managerAction ? managerAction.action === 'APPROVE' : false;

        if (userRole === 'ADMIN') {
          canAct = a.status === 'PENDING';
        } else if (userRole === 'SALES_MANAGER') {
          canAct = a.status === 'PENDING' && (a.approvalLevel === 'SALES_MANAGER' || (a.approvalLevel === 'SALES_MANAGER_AND_FINANCE' && !managerAction));
        } else if (userRole === 'FINANCE') {
          canAct = a.status === 'PENDING' && (a.approvalLevel === 'FINANCE' || (a.approvalLevel === 'SALES_MANAGER_AND_FINANCE' && managerApproved));
        }

        // Determine if approval is relevant to current role for history stacks
        let isRoleRelevant = true;
        if (userRole === 'SALES_MANAGER') {
          isRoleRelevant = a.approvalLevel === 'SALES_MANAGER' || a.approvalLevel === 'SALES_MANAGER_AND_FINANCE';
        } else if (userRole === 'FINANCE') {
          isRoleRelevant = a.approvalLevel === 'FINANCE' || a.approvalLevel === 'SALES_MANAGER_AND_FINANCE';
        }

        return {
          ...a,
          canAct,
          isRoleRelevant,
        };
      })
      .filter((a) => a.isRoleRelevant);

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

    // Enhanced role eligibility check
    if (userRole === 'SALES_REP' || userRole === 'CUSTOMER') {
      res.status(403).json({ error: 'Only Sales Managers, Finance users, or Admins can act on approvals.' });
      return;
    }

    const previousActions = approval.actions;
    const managerAction = previousActions.find((a) => {
      const roleName = a.user?.role?.name;
      return roleName === 'SALES_MANAGER' || roleName === 'ADMIN';
    });
    const managerApproved = managerAction ? managerAction.action === 'APPROVE' : false;

    if (approval.approvalLevel === 'SALES_MANAGER_AND_FINANCE') {
      if (userRole === 'SALES_MANAGER' && managerAction) {
        res.status(400).json({ error: 'Sales Manager has already submitted a decision for this quotation.' });
        return;
      }
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
          if (userRole === 'ADMIN') {
            // Admin override approves the whole deal immediately
            updatedApprovalStatus = 'APPROVED';
            updatedQuoteStatus = 'APPROVED';
          } else if (userRole === 'FINANCE') {
            // Finance approved (and Manager had already approved) -> Fully APPROVED
            updatedApprovalStatus = 'APPROVED';
            updatedQuoteStatus = 'APPROVED';
          } else if (userRole === 'SALES_MANAGER') {
            // Sales Manager approved first step; MUST remain PENDING and quotation MUST remain PENDING_APPROVAL
            updatedApprovalStatus = 'PENDING';
            updatedQuoteStatus = 'PENDING_APPROVAL';
          }
        } else if (approval.approvalLevel === 'SALES_MANAGER') {
          if (userRole === 'FINANCE') {
            res.status(403).json({ error: 'This quotation requires Sales Manager approval.' });
            return { error: 'Only Sales Manager or Admin can approve this level.' };
          }
          updatedApprovalStatus = 'APPROVED';
          updatedQuoteStatus = 'APPROVED';
        } else if (approval.approvalLevel === 'FINANCE') {
          if (userRole === 'SALES_MANAGER') {
            res.status(403).json({ error: 'This quotation requires Finance approval.' });
            return { error: 'Only Finance or Admin can approve this level.' };
          }
          updatedApprovalStatus = 'APPROVED';
          updatedQuoteStatus = 'APPROVED';
        } else {
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

    if ('error' in result) {
      res.status(403).json({ error: result.error });
      return;
    }

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
