import {
  AiEngineInput,
  Block,
  CheckIn,
  CompletionFeedback,
  RangeBounds,
  Task,
} from './types.js';
import { isWithinRange, normalizeRange, parseDateFromYMD } from './utils.js';

export interface FilteredData {
  range: RangeBounds;
  blocks: Block[];
  tasks: Task[];
  checkIns: CheckIn[];
  feedback: CompletionFeedback[];
}

export interface FeedbackIndex {
  byBlock: Map<string, CompletionFeedback[]>;
  byTask: Map<string, CompletionFeedback[]>;
}

export function filterInputByRange(input: AiEngineInput): FilteredData {
  const range = normalizeRange(input.from, input.to);
  const blocks = filterBlocks(input.blocks, range);
  const tasks = filterTasks(input.tasks, range);
  const checkIns = filterCheckIns(input.checkIns, range);
  const feedback = filterFeedback(input.feedback, range);
  return { range, blocks, tasks, checkIns, feedback };
}

export function filterBlocks(blocks: Block[], range: RangeBounds): Block[] {
  return blocks.filter((block) => isWithinRange(block.start, range) || isWithinRange(block.end, range));
}

export function filterTasks(tasks: Task[], range: RangeBounds): Task[] {
  return tasks.filter((task) => {
    const createdInRange = isWithinRange(task.createdAt, range);
    const dueInRange = task.dueDate ? isWithinRange(task.dueDate, range) : false;
    const completedInRange = task.completedAt ? isWithinRange(task.completedAt, range) : false;
    return createdInRange || dueInRange || completedInRange;
  });
}

export function filterCheckIns(checkIns: CheckIn[], range: RangeBounds): CheckIn[] {
  return checkIns.filter((checkIn) => isWithinRange(parseDateFromYMD(checkIn.date), range));
}

export function filterFeedback(feedback: CompletionFeedback[], range: RangeBounds): CompletionFeedback[] {
  return feedback.filter((item) => isWithinRange(item.completedAt, range));
}

export function buildFeedbackIndex(feedback: CompletionFeedback[]): FeedbackIndex {
  const byBlock = new Map<string, CompletionFeedback[]>();
  const byTask = new Map<string, CompletionFeedback[]>();
  for (const item of feedback) {
    if (item.blockId) {
      const list = byBlock.get(item.blockId) ?? [];
      list.push(item);
      byBlock.set(item.blockId, list);
    }
    if (item.taskId) {
      const list = byTask.get(item.taskId) ?? [];
      list.push(item);
      byTask.set(item.taskId, list);
    }
  }
  return { byBlock, byTask };
}

export function blockDurationMinutes(block: Block): number {
  return block.actualDurationMinutes ?? block.plannedDurationMinutes ?? 0;
}

export function taskAnchorDate(task: Task): Date {
  return task.dueDate ?? task.createdAt;
}
