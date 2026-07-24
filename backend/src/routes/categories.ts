import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { requireRole, CAN_WRITE } from '../middleware/auth.js';

export const categoriesRouter = Router();

// GET /api/categories
categoriesRouter.get('/', async (_req, res) => {
  const { data: categories, error } = await supabase
    .from('Category')
    .select('*')
    .order('name', { ascending: true });
  if (error) return res.status(500).json({ error: 'Erro ao buscar categorias' });

  return res.json(categories ?? []);
});

// POST /api/categories
categoriesRouter.post('/', requireRole(...CAN_WRITE), async (req, res) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const { data: category, error } = await supabase
    .from('Category')
    .upsert({ name: parsed.data.name }, { onConflict: 'name' })
    .select()
    .single();
  if (error || !category) return res.status(500).json({ error: 'Erro ao criar categoria' });

  return res.status(201).json(category);
});
