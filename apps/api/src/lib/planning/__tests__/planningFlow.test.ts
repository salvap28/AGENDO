import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAnswerToIntent, detectPlanningGaps } from '../gaps.js';
import { buildMultiDayStrategy } from '../multiDayStrategy.js';
import { defaultQuestions } from '../questionSelector.js';
import type { PlanIntent, PlanningSession } from '../types.js';

test('detectPlanningGaps flags macro gaps for multi-day input', () => {
  const intent: PlanIntent = {
    horizon: 'multi_day',
    horizonDays: undefined,
    dateRange: undefined,
    tasks: [
      {
        title: 'Estudiar programacion',
        taskType: 'STUDY',
        estimatedTotalMinutes: 360,
        confidence: 0.7,
      },
      {
        title: 'Entrenar',
        taskType: 'PHYSICAL',
        frequency: 2,
        confidence: 0.7,
      },
    ],
    preferences: {
      energyPattern: 'unknown',
      heavyTasksTime: 'unknown',
      dayScope: 'unknown',
      fixedCommitments: 'unknown',
      trainingSpacing: 'unknown',
      agendoDistribution: 'unknown',
      agendoFocus: 'unknown',
    },
    emotionalConstraints: ['no cansarme'],
    confidence: 0.6,
  };

  const gaps = detectPlanningGaps(intent).map((gap) => gap.key);
  assert.ok(gaps.includes('HORIZON_CLARITY'));
  assert.ok(gaps.includes('DATE_RANGE'));
  assert.ok(gaps.includes('DAY_SCOPE'));
  assert.ok(gaps.includes('FIXED_COMMITMENTS'));
  assert.ok(gaps.includes('ENERGY_PATTERN'));
  assert.ok(gaps.includes('STUDY_WINDOW'));
  assert.ok(gaps.includes('TRAINING_SPACING'));
});

test('default questions avoid micro scheduling', () => {
  const questions = Object.values(defaultQuestions);
  questions.forEach((text) => {
    assert.ok(!/\b\d{1,2}:\d{2}\b/.test(text));
    assert.ok(!/(a que hora|hora exacta|horario exacto)/i.test(text));
  });
});

test('applyAnswerToIntent captures agendo distribution and focus', () => {
  const intent: PlanIntent = {
    horizon: 'multi_day',
    horizonDays: 4,
    dateRange: undefined,
    tasks: [
      {
        title: 'Avanzar en Agendo',
        taskType: 'WORK',
        confidence: 0.7,
      },
    ],
    preferences: {
      energyPattern: 'unknown',
      heavyTasksTime: 'unknown',
      dayScope: 'unknown',
      fixedCommitments: 'unknown',
      trainingSpacing: 'unknown',
      agendoDistribution: 'unknown',
      agendoFocus: 'unknown',
    },
    emotionalConstraints: [],
    confidence: 0.6,
  };

  const updated = applyAnswerToIntent(intent, 'AGENDO_DISTRIBUTION', 'Repartir igual, frontend y motor de IA');
  assert.equal(updated.preferences.agendoDistribution, 'even');
  assert.equal(updated.preferences.agendoFocus, 'both');
});

test('buildMultiDayStrategy alternates agendo focus and avoids consecutive training', () => {
  const intent: PlanIntent = {
    horizon: 'multi_day',
    horizonDays: 4,
    dateRange: undefined,
    tasks: [
      {
        title: 'Avanzar en Agendo',
        taskType: 'WORK',
        estimatedTotalMinutes: 60,
        confidence: 0.8,
      },
      {
        title: 'Entrenar',
        taskType: 'PHYSICAL',
        estimatedTotalMinutes: 60,
        frequency: 2,
        confidence: 0.8,
      },
    ],
    preferences: {
      energyPattern: 'medium',
      heavyTasksTime: 'morning',
      dayScope: 'all',
      fixedCommitments: 'no',
      trainingSpacing: 'non_consecutive',
      agendoDistribution: 'even',
      agendoFocus: 'both',
    },
    emotionalConstraints: [],
    confidence: 0.8,
  };

  const session: PlanningSession = {
    id: 'session_test',
    stage: 'planning',
    userInput: 'En los proximos dias quiero estudiar, entrenar y no cansarme',
    contextDate: '2025-01-01',
    intent,
    gaps: [],
    questions: [],
    answers: [],
    meta: { assumptions: [], ruleDecisions: [] },
  };

  const strategy = buildMultiDayStrategy(session);
  assert.equal(strategy.days.length, 4);

  const agendoTitles = strategy.days.flatMap((day) =>
    day.tasks.filter((task) => /agendo/i.test(task.title)).map((task) => task.title)
  );
  assert.ok(agendoTitles.some((title) => title.includes('Frontend')));
  assert.ok(agendoTitles.some((title) => title.includes('IA')));

  const trainingDays = strategy.days
    .filter((day) => day.tasks.some((task) => task.taskType === 'PHYSICAL'))
    .map((day) => day.dayIndex)
    .sort((a, b) => a - b);

  for (let i = 1; i < trainingDays.length; i += 1) {
    assert.ok(trainingDays[i] - trainingDays[i - 1] >= 2);
  }
});
