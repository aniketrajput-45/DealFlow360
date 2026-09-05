import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { FulfillmentEngineService } from './fulfillment.service';

export const previewAllocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      res.status(400).json({ error: 'productId and quantity are required.' });
      return;
    }

    const preview = await FulfillmentEngineService.calculateAllocation(productId, parseInt(quantity, 10));
    res.json(preview);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to preview allocation.' });
  }
};

export const allocateOrderFulfillment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, customAllocations } = req.body;
    if (!orderId) {
      res.status(400).json({ error: 'orderId is required.' });
      return;
    }

    const allocations = await FulfillmentEngineService.allocateOrder(orderId, customAllocations);
    res.json({ message: 'Order fulfillment allocated successfully.', allocations });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Allocation failed.' });
  }
};

export const getWarehousesWithInventory = async (_req: Request, res: Response): Promise<void> => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      include: {
        inventory: {
          include: { product: true },
        },
      },
      orderBy: { shippingCostWeight: 'asc' },
    });

    res.json(warehouses);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch warehouses.' });
  }
};
