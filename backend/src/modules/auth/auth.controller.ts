import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dealflow360_super_secret_jwt_key_hackathon_2026';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        role: true,
        customer: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        customerId: user.customerId,
        customerName: user.customer?.companyName || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed.' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, roleName = 'SALES_REP', customerId } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists.' });
      return;
    }

    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      res.status(400).json({ error: `Invalid role specified: ${roleName}` });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        roleId: role.id,
        customerId: customerId || null,
      },
      include: {
        role: true,
        customer: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        customerId: user.customerId,
        customerName: user.customer?.companyName || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed.' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: true,
        customer: {
          include: { tier: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        customerId: user.customerId,
        customer: user.customer
          ? {
              id: user.customer.id,
              companyName: user.customer.companyName,
              tier: user.customer.tier.name,
              maxDiscountPercent: user.customer.tier.maxDiscountPercent,
            }
          : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch current user.' });
  }
};

export const getDemoAccounts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        customer: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role.name,
        companyName: u.customer?.companyName || null,
        defaultPassword: 'password123',
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch demo accounts.' });
  }
};
