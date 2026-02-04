import assert from 'node:assert/strict';
import express from 'express';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import coachRouter, { __setCoachDeps } from '../src/routes/coach.js';
import type { PrismaClient } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_cambialo';

function createMockPrisma(): Partial<PrismaClient> {
  const emptyArray = async () => [];
  const emptyUnique = async () => null;
  return {
    block: { findMany: emptyArray } as any,
    task: { findMany: emptyArray } as any,
    dailyMetric: { findMany: emptyArray } as any,
    completionFeedback: { findMany: emptyArray } as any,
    onboardingState: { findUnique: emptyUnique } as any,
  };
}

const mockCoachJson = {
  weeklySummaryText: 'Resumen OK',
  insights: ['insight 1', 'insight 2', 'insight 3'],
  recommendations: ['rec 1', 'rec 2', 'rec 3'],
  reflectionQuestion: 'Que pequeno gesto podrias darte manana para acompanarte mejor?',
};

function createMockCall() {
  return async () => ({
    message: { role: 'assistant', content: JSON.stringify(mockCoachJson) },
    content: JSON.stringify(mockCoachJson),
    model: 'mock',
  });
}

function createMockCallWithRepair() {
  let count = 0;
  return async () => {
    count += 1;
    if (count === 1) {
      return { message: { role: 'assistant', content: 'texto sin json valido' }, content: 'texto sin json valido', model: 'mock' };
    }
    return { message: { role: 'assistant', content: JSON.stringify(mockCoachJson) }, content: JSON.stringify(mockCoachJson), model: 'mock' };
  };
}

async function buildTestApp(mockCall?: any) {
  __setCoachDeps({
    prisma: createMockPrisma() as PrismaClient,
    callOllamaChat: (mockCall ?? createMockCall()) as any,
  });

  const app = express();
  app.use(express.json());
  app.use('/api/ai/coach', coachRouter);
  return app;
}

async function runHappyPath() {
  const app = await buildTestApp();
  const token = jwt.sign({ sub: 'user_test' }, JWT_SECRET);

  const res = await supertest(app)
    .post('/api/ai/coach')
    .set('Authorization', `Bearer ${token}`)
    .send({ from: '2025-11-01', to: '2025-11-07' })
    .expect(200);

  assert.ok(res.body.coach, 'Deberia devolver coach');
  assert.equal(res.body.coach.weeklySummaryText, 'Resumen OK');
  assert.deepEqual(res.body.coach.insights.length, 3);
  assert.deepEqual(res.body.coach.recommendations.length, 3);
  assert.equal(
    res.body.coach.reflectionQuestion,
    'Que pequeno gesto podrias darte manana para acompanarte mejor?'
  );
  console.log('✅ coach endpoint responde con la IA mockeada y JSON valido');
}

async function runRepairPath() {
  const app = await buildTestApp(createMockCallWithRepair());
  const token = jwt.sign({ sub: 'user_test' }, JWT_SECRET);

  const res = await supertest(app)
    .post('/api/ai/coach')
    .set('Authorization', `Bearer ${token}`)
    .send({ from: '2025-11-01', to: '2025-11-07' })
    .expect(200);

  assert.equal(res.body.coach.weeklySummaryText, 'Resumen OK');
  console.log('✅ coach endpoint repara JSON invalido y responde valido');
}

runHappyPath()
  .then(runRepairPath)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
