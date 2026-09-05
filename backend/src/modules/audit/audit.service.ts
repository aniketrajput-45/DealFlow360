import { prisma } from '../../config/prisma';

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any> | string;
}

export class AuditService {
  /**
   * Append-only audit logger.
   * Records business actions with user, timestamp, entity, and context details.
   */
  static async record(params: CreateAuditLogParams) {
    try {
      const detailsStr = typeof params.details === 'object'
        ? JSON.stringify(params.details)
        : params.details || null;

      return await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          details: detailsStr,
        },
      });
    } catch (err) {
      console.error('[AuditService Error] Failed to write audit record:', err);
    }
  }

  /**
   * Fetch audit logs for an entity or platform-wide (internal view).
   */
  static async getLogs(filter?: { entityType?: string; entityId?: string; limit?: number }) {
    return prisma.auditLog.findMany({
      where: {
        ...(filter?.entityType ? { entityType: filter.entityType } : {}),
        ...(filter?.entityId ? { entityId: filter.entityId } : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: { select: { name: true } } },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: filter?.limit || 100,
    });
  }
}
