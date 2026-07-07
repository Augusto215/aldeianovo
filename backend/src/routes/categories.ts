import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireRole, CAN_WRITE } from '../middleware/auth.js';

export const categoriesRouter = Router();

// GET /api/categories
categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
  return res.json(categories);
});

// POST /api/categories
categoriesRouter.post('/', requireRole(...CAN_WRITE), async (req, res) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const category = await prisma.category.upsert({
    where: { name: parsed.data.name },
    update: {},
    create: { name: parsed.data.name },
  });
  return res.status(201).json(category);
});
