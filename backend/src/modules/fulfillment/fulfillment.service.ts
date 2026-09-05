import { prisma } from '../../config/prisma';

export interface ProposedAllocation {
  orderItemId?: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  allocations: {
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    shippingCostWeight: number;
    quantity: number;
    shippingCost: number;
  }[];
  totalAllocated: number;
  backorderedQuantity: number;
  isSplit: boolean;
  totalShippingCost: number;
  shipmentCount: number;
}

export class FulfillmentEngineService {
  /**
   * Recommends optimal warehouse allocation for a product and required quantity.
   * Prioritizes lowest shipping cost factor and availability.
   */
  static async calculateAllocation(
    productId: string,
    requestedQuantity: number
  ): Promise<ProposedAllocation> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventory: {
          include: { warehouse: true },
          where: { warehouse: { isActive: true }, quantityAvailable: { gt: 0 } },
        },
      },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found.`);
    }

    // Sort warehouses by shipping cost weight ascending (cheapest / preferred first)
    const availableInventory = [...product.inventory].sort(
      (a, b) => a.warehouse.shippingCostWeight - b.warehouse.shippingCostWeight
    );

    let remainingNeeded = requestedQuantity;
    const allocations: ProposedAllocation['allocations'] = [];
    const BASE_SHIPPING_PER_UNIT = 300; // INR base shipping cost per hardware unit

    for (const inv of availableInventory) {
      if (remainingNeeded <= 0) break;

      const takeQty = Math.min(inv.quantityAvailable, remainingNeeded);
      if (takeQty > 0) {
        const shippingCost = Math.round(takeQty * BASE_SHIPPING_PER_UNIT * inv.warehouse.shippingCostWeight);
        allocations.push({
          warehouseId: inv.warehouseId,
          warehouseName: inv.warehouse.name,
          warehouseCode: inv.warehouse.code,
          shippingCostWeight: inv.warehouse.shippingCostWeight,
          quantity: takeQty,
          shippingCost,
        });

        remainingNeeded -= takeQty;
      }
    }

    const totalAllocated = requestedQuantity - remainingNeeded;
    const totalShippingCost = allocations.reduce((sum, a) => sum + a.shippingCost, 0);

    return {
      productId: product.id,
      productName: product.name,
      requestedQuantity,
      allocations,
      totalAllocated,
      backorderedQuantity: remainingNeeded,
      isSplit: allocations.length > 1,
      totalShippingCost,
      shipmentCount: allocations.length,
    };
  }

  /**
   * Applies allocation for an entire confirmed order, persisting WarehouseAllocation records
   * and updating live inventory records atomically.
   */
  static async allocateOrder(orderId: string, customAllocations?: Record<string, { warehouseId: string; quantity: number }[]>) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    return await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of order.items) {
        // Only physical products need warehouse allocation (services/subscriptions are virtual)
        if (item.product.productType === 'RECURRING' || item.product.unit === 'hour' || item.product.unit === 'package' || item.product.unit === 'service') {
          continue;
        }

        // Check if custom override provided, otherwise auto-calculate
        let splits: { warehouseId: string; quantity: number; shippingCost?: number }[] = [];
        if (customAllocations && customAllocations[item.id]) {
          splits = customAllocations[item.id];
        } else {
          const recommendation = await this.calculateAllocation(item.productId, item.quantity);
          splits = recommendation.allocations;
        }

        let allocatedCount = 0;
        for (const split of splits) {
          const warehouse = await tx.warehouse.findUnique({ where: { id: split.warehouseId } });
          const weight = warehouse?.shippingCostWeight || 1.0;
          const shippingCost = split.shippingCost ?? Math.round(split.quantity * 300 * weight);

          // 1. Create WarehouseAllocation
          const alloc = await tx.warehouseAllocation.create({
            data: {
              orderItemId: item.id,
              warehouseId: split.warehouseId,
              quantity: split.quantity,
              shippingCost,
            },
          });

          // 2. Decrement available inventory
          await tx.inventory.update({
            where: {
              warehouseId_productId: {
                warehouseId: split.warehouseId,
                productId: item.productId,
              },
            },
            data: {
              quantityAvailable: {
                decrement: split.quantity,
              },
            },
          });

          allocatedCount += split.quantity;
          results.push(alloc);
        }

        // Update item fulfillment status
        const status = allocatedCount >= item.quantity
          ? 'ALLOCATED'
          : allocatedCount > 0
          ? 'PARTIALLY_ALLOCATED'
          : 'PENDING';

        await tx.orderItem.update({
          where: { id: item.id },
          data: { fulfillmentStatus: status },
        });
      }

      return results;
    });
  }
}
