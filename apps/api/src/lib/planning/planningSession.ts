import { randomUUID } from 'crypto';
import type { PlanningSession, QuestionOption } from './types.js';

const sessions = new Map<string, PlanningSession>();

const nowIso = () => new Date().toISOString();

export function createPlanningSession(userInput: string, contextDate: string): PlanningSession {
  const id = `planning_${Date.now()}_${randomUUID()}`;
  const session: PlanningSession = {
    id,
    stage: 'intake',
    userInput,
    contextDate,
    gaps: [],
    questions: [],
    answers: [],
    meta: {
      assumptions: [],
      ruleDecisions: [],
    },
  };
  sessions.set(id, session);
  return session;
}

export function getPlanningSession(id: string): PlanningSession | undefined {
  return sessions.get(id);
}

export function savePlanningSession(session: PlanningSession): void {
  sessions.set(session.id, session);
}

export function deletePlanningSession(id: string): void {
  sessions.delete(id);
}

export function addQuestion(
  session: PlanningSession,
  gapKey: PlanningSession['gaps'][number]['key'],
  text: string,
  options?: QuestionOption[]
): PlanningSession {
  const question = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    gapKey,
    text,
    options,
    createdAt: nowIso(),
  };
  session.questions.push(question);
  savePlanningSession(session);
  return session;
}

export function addAnswer(session: PlanningSession, questionId: string, gapKey: PlanningSession['gaps'][number]['key'], response: string): PlanningSession {
  session.answers.push({
    questionId,
    gapKey,
    response,
    createdAt: nowIso(),
  });
  savePlanningSession(session);
  return session;
}
