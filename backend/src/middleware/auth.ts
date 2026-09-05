import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  customerId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dealflow360_super_secret_jwt_key_hackathon_2026';

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. Please provide a Bearer token.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User account is invalid or inactive.' });
      return;
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      customerId: user.customerId,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      res.status(403).json({
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
};

export const requireCustomerScope = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  // If internal user (ADMIN, SALES_REP, SALES_MANAGER, FINANCE, WAREHOUSE), they can access customer data
  if (req.user.role !== 'CUSTOMER') {
    return next();
  }

  // If CUSTOMER role, verify they have an associated customerId
  if (!req.user.customerId) {
    res.status(403).json({ error: 'Customer account has no associated organization.' });
    return;
  }

  next();
};
