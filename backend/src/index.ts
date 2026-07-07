import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { authRouter } from './routes/auth.js';
import { transactionsRouter } from './routes/transactions.js';
import { accountsRouter } from './routes/accounts.js';
import { categoriesRouter } from './routes/categories.js';
import { usersRouter } from './routes/users.js';
import { reportsRouter } from './routes/reports.js';
import { documentsRouter } from './routes/documents.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'aldeia-api', version: '0.1.0' }),
);

// Rotas públicas
app.use('/api/auth', authRouter);

// Rotas protegidas (exigem JWT)
app.use('/api/transactions', requireAuth, transactionsRouter);
app.use('/api/accounts', requireAuth, accountsRouter);
app.use('/api/categories', requireAuth, categoriesRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/reports', requireAuth, reportsRouter);

// GED — Etapa 2 (esqueleto; inicia após a conclusão da Etapa 1)
app.use('/api/documents', requireAuth, documentsRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

app.listen(env.port, () => {
  console.log(`🌿 API Aldeia rodando em http://localhost:${env.port}`);
});
