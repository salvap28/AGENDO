import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth.js';
import blocksRouter from './routes/blocks.js';
import checkinsRouter from './routes/checkins.js';
import completionsRouter from './routes/completions.js';
import tasksRouter from './routes/tasks.js';
import dayStateRouter from './routes/dayState.js';
import statsRouter from './routes/stats.js';
import aiSummaryRouter from './routes/aiSummary.js';
import onboardingRouter from './routes/onboarding.js';
import ollamaTestRouter from './routes/ollamaTest.js';
import coachRouter from './routes/coach.js';
import weeklyInsightsRouter from './routes/weeklyInsights.js';
import userRouter from './routes/user.js';
import focusesRouter from './routes/focuses.js';
import notificationsRouter from './routes/notifications.js';
import planRouter from './routes/plan.js';
import intelligentPlanningRouter from './routes/intelligentPlanning.js';
import devRouter from './routes/dev.js';

export const prisma = new PrismaClient();

const isPrivateNetworkHost = (hostname: string) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.startsWith('192.168.') ||
  hostname.startsWith('10.') ||
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
  hostname.endsWith('.devtunnels.ms');

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      try {
        const hostname = new URL(origin).hostname;
        if (isPrivateNetworkHost(hostname)) {
          return callback(null, true);
        }
      } catch {
        return callback(new Error('Origen inválido'));
      }
      return callback(new Error(`Origen no permitido: ${origin}`));
    },
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/blocks', blocksRouter);
app.use('/api/checkins', checkinsRouter);
app.use('/api/completions', completionsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/day-state', dayStateRouter);
app.use('/api/stats', statsRouter);
app.use('/api/ai/summary', aiSummaryRouter);
app.use('/api/ai/ollama-test', ollamaTestRouter);
app.use('/api/ai/coach', coachRouter);
app.use('/api/ai/weekly-insights', weeklyInsightsRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/user', userRouter);
app.use('/api/focuses', focusesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/plan', planRouter);
app.use('/api/ai/intelligent-planning', intelligentPlanningRouter);
app.use('/api/dev', devRouter);

const port = parseInt(process.env.PORT || '4000', 10);
app.listen(port, () => console.log(`[api] http://localhost:${port}`));
