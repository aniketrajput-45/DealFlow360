import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { RiskEngineService } from '../risk-engine/risk.service';
import { AuditService } from '../audit/audit.service';

export const submitCounterOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quotationId, proposedDiscountPercent, message } = req.body;
    const userId = req.user?.id;

    if (!userId || !quotationId || proposedDiscountPercent === undefined) {
      res.status(400).json({ error: 'quotationId and proposedDiscountPercent are required.' });
      return;
    }

    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!quote) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }

    // Boundary check for Customer role
    if (req.user?.role === 'CUSTOMER' && quote.customerId !== req.user.customerId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    // Calculate current average discount for history
    const previousDiscountPercent = quote.subtotal > 0
      ? Math.round((quote.discountAmount / quote.subtotal) * 1000) / 10
      : 0;

    // Simulate lines with the new requested counter discount
    const targetDiscount = parseFloat(proposedDiscountPercent);
    const simulatedItems = quote.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: targetDiscount,
    }));

    // Authoritative Risk Recalculation
    const evaluation = await RiskEngineService.evaluateQuote(quote.customerId, simulatedItems);

    const negotiationResult = await prisma.$transaction(async (tx) => {
      // 1. Create Negotiation record
      const negotiation = await tx.negotiation.create({
        data: {
          quotationId,
          initiatedById: userId,
          previousDiscountPercent,
          proposedDiscountPercent: targetDiscount,
          previousTotalAmount: quote.totalAmount,
          proposedTotalAmount: evaluation.totalAmount,
          riskScore: evaluation.riskScore,
          requiredApprovalLevel: evaluation.requiredApprovalLevel,
          status: 'PENDING',
          message: message || null,
        },
      });

      // 2. Update quote status to NEGOTIATION
      await tx.quotation.update({
        where: { id: quotationId },
        data: {
          status: 'NEGOTIATION',
        },
      });

      // 3. Post as a quote comment as well
      await tx.quoteComment.create({
        data: {
          quotationId,
          userId,
          message: `[Counter-Offer] Requested discount: ${targetDiscount}%. Message: ${message || 'No additional note.'}`,
          isCustomerVisible: true,
        },
      });

      return negotiation;
    });

    // 4. Append to AuditLog
    await AuditService.record({
      userId,
      action: 'COUNTER_OFFER_SUBMITTED',
      entityType: 'Quotation',
      entityId: quotationId,
      details: {
        previousDiscountPercent,
        proposedDiscountPercent: targetDiscount,
        riskScore: evaluation.riskScore,
        requiredApprovalLevel: evaluation.requiredApprovalLevel,
      },
    });

    res.status(201).json({
      negotiation: negotiationResult,
      evaluation,
      message: 'Counter offer submitted successfully. The quote is now under review.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit counter offer.' });
  }
};

export const respondToCounterOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { negotiationId } = req.params;
    const { action, responseMessage } = req.body; // APPROVE or REJECT
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ error: 'Valid action (APPROVE or REJECT) is required.' });
      return;
    }

    if (userRole === 'CUSTOMER') {
      res.status(403).json({ error: 'Customers cannot approve their own counter-offers.' });
      return;
    }

    const negotiation = await prisma.negotiation.findUnique({
      where: { id: negotiationId },
      include: {
        quotation: {
          include: { items: true },
        },
      },
    });

    if (!negotiation) {
      res.status(404).json({ error: 'Negotiation record not found.' });
      return;
    }

    const quote = negotiation.quotation;

    const result = await prisma.$transaction(async (tx) => {
      if (action === 'REJECT') {
        await tx.negotiation.update({
          where: { id: negotiationId },
          data: { status: 'REJECTED' },
        });

        await tx.quotation.update({
          where: { id: quote.id },
          data: { status: 'APPROVED' }, // Reverts to previous approved terms
        });

        await tx.quoteComment.create({
          data: {
            quotationId: quote.id,
            userId,
            message: `[Counter-Offer Rejected] Seller rejected requested terms. Note: ${responseMessage || 'Original terms stand.'}`,
            isCustomerVisible: true,
          },
        });

        return { status: 'REJECTED' };
      }

      // If APPROVE:
      // Check if re-approval is required by higher authority (e.g. Sales Manager + Finance)
      const simulatedItems = quote.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPercent: negotiation.proposedDiscountPercent,
      }));

      const evaluation = await RiskEngineService.evaluateQuote(quote.customerId, simulatedItems);

      // Update Quotation Items with new agreed discount terms
      for (const evaluatedLine of evaluation.lines) {
        const itemToUpdate = quote.items.find((i) => i.productId === evaluatedLine.productId);
        if (itemToUpdate) {
          await tx.quotationItem.update({
            where: { id: itemToUpdate.id },
            data: {
              discountPercent: evaluatedLine.discountPercent,
              discountAmount: evaluatedLine.discountAmount,
              taxPercent: evaluatedLine.taxPercent,
              lineSubtotal: evaluatedLine.lineSubtotal,
              lineTotal: evaluatedLine.lineTotal,
              marginAmount: evaluatedLine.marginAmount,
              riskPoints: evaluatedLine.riskPoints,
            },
          });
        }
      }

      // Check if risk score warrants multi-level approval
      let newQuoteStatus = 'APPROVED';
      if (evaluation.requiresApproval) {
        // Automatically re-enters approval workflow!
        newQuoteStatus = 'PENDING_APPROVAL';

        await tx.approval.create({
          data: {
            quotationId: quote.id,
            approvalLevel: evaluation.requiredApprovalLevel,
            status: 'PENDING',
            riskScore: evaluation.riskScore,
            reason: `Customer counter-offer accepted by rep. ${evaluation.riskExplanation}`,
          },
        });
      }

      await tx.quotation.update({
        where: { id: quote.id },
        data: {
          subtotal: evaluation.subtotal,
          discountAmount: evaluation.totalDiscountAmount,
          taxAmount: evaluation.totalTaxAmount,
          totalAmount: evaluation.totalAmount,
          totalMargin: evaluation.totalMargin,
          riskScore: evaluation.riskScore,
          requiredApprovalLevel: evaluation.requiredApprovalLevel,
          status: newQuoteStatus,
        },
      });

      await tx.negotiation.update({
        where: { id: negotiationId },
        data: { status: 'APPROVED' },
      });

      await tx.quoteComment.create({
        data: {
          quotationId: quote.id,
          userId,
          message: `[Counter-Offer Accepted] Seller accepted ${negotiation.proposedDiscountPercent}% discount. Note: ${responseMessage || 'Terms updated.'}`,
          isCustomerVisible: true,
        },
      });

      return { status: 'APPROVED', newQuoteStatus };
    });

    await AuditService.record({
      userId,
      action: `NEGOTIATION_${action}`,
      entityType: 'Quotation',
      entityId: quote.id,
      details: {
        negotiationId,
        action,
        responseMessage,
        resultingStatus: result.status,
      },
    });

    res.json({
      message: `Counter-offer ${action.toLowerCase()}ed successfully.`,
      result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process counter offer.' });
  }
};
