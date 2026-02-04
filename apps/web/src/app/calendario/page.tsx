'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CalendarMonth, {
  type AccentTone,
  type Day,
  type DayBlock,
  type DayState,
  type DayTask,
} from '@/components/calendar/CalendarMonth';
import DayOverlay from '@/components/calendar/DayOverlay';
import api from '@/lib/api';
import type { CompletionFeedback, CompletionPayload } from '@/types/completion';
import { useNotificationChecker } from '@/hooks/useNotificationChecker';

export const dynamic = 'force-dynamic';

type CheckInItem = {
  date: string;
  sleepDuration: number | null;
  sleepQuality: number | null;
  energyLevel: number | null;
  mood: string | null;
  stress: string | null;
  focus: string | null;
};

type BlockItem = {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  color?: string | null;
  completed?: boolean | null;
  repeatRule?: RepeatRule | null;
  repeatExceptions?: string[] | null;
  notifications?: { minutesBefore: number }[] | null;
  sourceDate?: string;
};

type TaskItem = {
  id: string;
  date: string;
  title: string;
  priority?: string | null;
  done: boolean;
  repeatRule?: RepeatRule | null;
  repeatExceptions?: string[] | null;
  notifications?: { minutesBefore: number }[] | null;
  sourceDate?: string;
};

type DayTagEntry = { label: string; tone: 'violet' | 'turquoise' | 'neutral' };

type RepeatRule = {
  kind: 'daily' | 'weekly' | 'custom';
  interval: number;
  daysOfWeek?: number[] | null;
  endDate?: string | null;
  count?: number | null;
};

type DayStateRecord = {
  note?: string | null;
  tags?: DayTagEntry[] | null;
};

type CheckInMap = Record<string, CheckInItem>;
type BlockMap = Record<string, BlockItem[]>;
type TaskMap = Record<string, TaskItem[]>;
type DayStateMap = Record<string, DayStateRecord>;
type CompletionMap = Record<string, CompletionFeedback[]>;

type BlockPayload = {
  title: string;
  start: string;
  end: string;
  tone: AccentTone;
  repeatRule?: RepeatRule | null;
  notifications?: { minutesBefore: number }[];
};
type TaskPayload = { 
  title: string; 
  priority: 'alta' | 'media' | 'baja'; 
  repeatRule?: RepeatRule | null;
  notifications?: { minutesBefore: number }[];
};
type DeleteScope = 'single' | 'count' | 'all';
type DeleteRequest = {
  id?: string;
  instanceDate: string;
  scope: DeleteScope;
  count?: number;
  repeatRule?: RepeatRule | null;
  exceptions?: string[] | null;
  sourceDate?: string | null;
};

export default function CalendarioPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [direction, setDirection] = useState<'enter-left' | 'enter-right' | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInMap>({});
  const [blocksMap, setBlocksMap] = useState<BlockMap>({});
  const [tasksMap, setTasksMap] = useState<TaskMap>({});
  const [stateMap, setStateMap] = useState<DayStateMap>({});
  const [completionsMap, setCompletionsMap] = useState<CompletionMap>({});
  const [rangeError, setRangeError] = useState<string | null>(null);
  const monthRange = useMemo(() => visibleRange(cursor), [cursor]);
  const [revision, setRevision] = useState(0);

  // Verificar notificaciones periódicamente
  useNotificationChecker();

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    const { start, end } = monthRange;
    const from = formatDateKey(start);
    const to = formatDateKey(end);
    const load = async () => {
      try {
        setRangeError(null);
        const [checkRes, blockRes, taskRes, stateRes, completionRes] = await Promise.all([
          api.get('/checkins', { params: { from, to } }),
          api.get('/blocks', { params: { from, to } }),
          api.get('/tasks', { params: { from, to } }),
          api.get('/day-state', { params: { from, to } }),
          api.get('/completions', { params: { from, to } }),
        ]);
        if (!active) return;
        setCheckIns(mapCheckIns(checkRes.data?.items ?? []));
        setBlocksMap(expandItems(blockRes.data?.items ?? [], start, end));
        setTasksMap(expandItems(taskRes.data?.items ?? [], start, end));
        setStateMap(mapDayState(stateRes.data?.items ?? []));
        setCompletionsMap(mapCompletions(completionRes.data?.items ?? []));
      } catch (err: any) {
        if (!active) return;
        console.error('[CalendarioPage] Error loading data:', err);
        if (err?.response) {
          console.error('[CalendarioPage] Response error:', {
            status: err.response.status,
            data: err.response.data,
            headers: err.response.headers,
          });
        }
        if (err?.response?.status === 401) {
          setCheckIns({});
          setBlocksMap({});
          setTasksMap({});
          setStateMap({});
          setCompletionsMap({});
        } else {
          const errorMessage = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Error desconocido';
          console.error('[CalendarioPage] Error message:', errorMessage);
          setRangeError(`No pudimos cargar tus datos del calendario. ${errorMessage}`);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [hydrated, monthRange, revision]);

  useEffect(() => {
    const handler = () => setRevision((prev) => prev + 1);
    window.addEventListener('agendo:checkin-saved', handler);
    return () => window.removeEventListener('agendo:checkin-saved', handler);
  }, []);

  useEffect(() => {
    const handler = () => setRevision((prev) => prev + 1);
    window.addEventListener('agendo:completion-saved', handler);
    return () => window.removeEventListener('agendo:completion-saved', handler);
  }, []);

  // Listen for open today overlay event
  useEffect(() => {
    const handleOpenTodayOverlay = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSelectedDate(today);
    };

    window.addEventListener('agendo:open-today-overlay', handleOpenTodayOverlay);

    return () => {
      window.removeEventListener('agendo:open-today-overlay', handleOpenTodayOverlay);
    };
  }, []);

  // Listen for quick action events and open DayOverlay if not open
  useEffect(() => {
    const handleOpenBlockForm = () => {
      if (!selectedDate) {
        // Si no hay día seleccionado, abrir el día actual
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setSelectedDate(today);
        // Esperar un momento para que el DayOverlay se monte y luego disparar el evento nuevamente
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('agendo:open-block-form'));
        }, 100);
      }
    };

    const handleOpenTaskForm = () => {
      if (!selectedDate) {
        // Si no hay día seleccionado, abrir el día actual
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setSelectedDate(today);
        // Esperar un momento para que el DayOverlay se monte y luego disparar el evento nuevamente
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('agendo:open-task-form'));
        }, 100);
      }
    };

    const handleOpenCheckin = () => {
      if (!selectedDate) {
        // Si no hay día seleccionado, abrir el día actual
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setSelectedDate(today);
        // Esperar un momento para que el DayOverlay se monte y luego disparar el evento nuevamente
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('agendo:open-checkin'));
        }, 100);
      }
    };

    window.addEventListener('agendo:open-block-form', handleOpenBlockForm);
    window.addEventListener('agendo:open-task-form', handleOpenTaskForm);
    window.addEventListener('agendo:open-checkin', handleOpenCheckin);

    return () => {
      window.removeEventListener('agendo:open-block-form', handleOpenBlockForm);
      window.removeEventListener('agendo:open-task-form', handleOpenTaskForm);
      window.removeEventListener('agendo:open-checkin', handleOpenCheckin);
    };
  }, [selectedDate]);

  const monthLabel = useMemo(() => {
    const formatted = cursor.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return capitalize(formatted);
  }, [cursor]);

  const weeks = useMemo(
    () => buildMonth(cursor, checkIns, blocksMap, tasksMap, stateMap, completionsMap),
    [cursor, checkIns, blocksMap, tasksMap, stateMap, completionsMap],
  );
  const flatDays = useMemo(() => weeks.flat(), [weeks]);
  const selectedDay = useMemo(() => {
    if (!selectedDate) return null;
    return flatDays.find((day) => sameDate(day.date, selectedDate)) ?? null;
  }, [flatDays, selectedDate]);

  const moveMonth = (delta: number, dir: 'enter-left' | 'enter-right') => {
    setDirection(dir);
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setSelectedDate(null);
  };

  const onPrevMonth = () => moveMonth(-1, 'enter-left');
  const onNextMonth = () => moveMonth(1, 'enter-right');

  const addBlock = useCallback(
    async (dateKey: string, payload: BlockPayload) => {
      const body = {
        date: dateKey,
        title: payload.title,
        start: payload.start,
        end: payload.end,
        color: payload.tone,
        repeatRule: payload.repeatRule ?? undefined,
        notifications: payload.notifications ?? undefined,
      };
      const response = await api.post('/blocks', body);
      const created: BlockItem = response.data?.item;
      setBlocksMap((prev) => {
        const next = { ...prev };
        const occurrences = computeOccurrences(created.date, created.repeatRule ?? null, monthRange.start, monthRange.end);
        for (const key of occurrences) {
          if (!next[key]) next[key] = [];
          next[key] = [...next[key], { ...created, date: key }];
        }
        return next;
      });
    },
    [monthRange.end, monthRange.start],
  );

  const updateBlock = useCallback(
    async (blockId: string, dateKey: string, payload: BlockPayload) => {
      const body = {
        date: dateKey,
        title: payload.title,
        start: payload.start,
        end: payload.end,
        color: payload.tone,
        repeatRule: payload.repeatRule ?? undefined,
        notifications: payload.notifications ?? undefined,
      };
      const response = await api.put(`/blocks/${blockId}`, body);
      const updated: BlockItem = response.data?.item;
      setBlocksMap((prev) => {
        const next = { ...prev };
        // Eliminar todas las ocurrencias del bloque anterior
        for (const key in next) {
          next[key] = next[key].filter((b) => b.id !== blockId);
        }
        // Agregar las nuevas ocurrencias
        const occurrences = computeOccurrences(updated.date, updated.repeatRule ?? null, monthRange.start, monthRange.end);
        for (const key of occurrences) {
          if (!next[key]) next[key] = [];
          next[key] = [...next[key], { ...updated, date: key }];
        }
        return next;
      });
    },
    [monthRange.end, monthRange.start],
  );

  const addTask = useCallback(
    async (dateKey: string, payload: TaskPayload) => {
      const response = await api.post('/tasks', {
        date: dateKey,
        title: payload.title,
        priority: payload.priority,
        repeatRule: payload.repeatRule ?? undefined,
        notifications: payload.notifications ?? undefined,
      });
      const created: TaskItem = response.data?.item;
      setTasksMap((prev) => {
        const next = { ...prev };
        const occurrences = computeOccurrences(created.date, created.repeatRule ?? null, monthRange.start, monthRange.end);
        for (const key of occurrences) {
          if (!next[key]) next[key] = [];
          next[key] = [...next[key], { ...created, date: key }];
        }
        return next;
      });
    },
    [monthRange.end, monthRange.start],
  );

  const updateTask = useCallback(
    async (taskId: string, dateKey: string, payload: TaskPayload) => {
      const body = {
        title: payload.title,
        priority: payload.priority,
        repeatRule: payload.repeatRule ?? undefined,
        notifications: payload.notifications ?? undefined,
      };
      const response = await api.patch(`/tasks/${taskId}`, body);
      const updated: TaskItem = response.data?.item;
      setTasksMap((prev) => {
        const next = { ...prev };
        // Eliminar todas las ocurrencias de la tarea anterior
        for (const key in next) {
          next[key] = next[key].filter((t) => t.id !== taskId);
        }
        // Agregar las nuevas ocurrencias
        const occurrences = computeOccurrences(updated.date, updated.repeatRule ?? null, monthRange.start, monthRange.end);
        for (const key of occurrences) {
          if (!next[key]) next[key] = [];
          next[key] = [...next[key], { ...updated, date: key }];
        }
        return next;
      });
    },
    [monthRange.end, monthRange.start],
  );

  const syncDayState = useCallback((dateKey: string, item: any) => {
    setStateMap((prev) => ({
      ...prev,
      [dateKey]: {
        note: item?.note ?? null,
        tags: (item?.tags as DayTagEntry[] | undefined) ?? [],
      },
    }));
  }, []);

  const updateNote = useCallback(
    async (dateKey: string, note: string) => {
      const response = await api.put('/day-state', { date: dateKey, note });
      syncDayState(dateKey, response.data?.item);
    },
    [syncDayState],
  );

  const updateTags = useCallback(
    async (dateKey: string, tags: DayTagEntry[]) => {
      const response = await api.put('/day-state', { date: dateKey, tags });
      syncDayState(dateKey, response.data?.item);
    },
    [syncDayState],
  );

  const resetTags = useCallback(
    async (dateKey: string) => {
      await updateTags(dateKey, []);
    },
    [updateTags],
  );

  const generateTag = useCallback(
    async (dateKey: string) => {
      const insight = buildAutoTag(checkIns[dateKey], tasksMap[dateKey], blocksMap[dateKey]);
      const existing = (stateMap[dateKey]?.tags as DayTagEntry[] | undefined) ?? [];
      await updateTags(dateKey, [...existing, insight]);
    },
    [blocksMap, checkIns, stateMap, tasksMap, updateTags],
  );

  const deleteBlock = useCallback(
    async (payload: DeleteRequest) => {
      if (!payload.id) return;
      try {
        if (payload.scope === 'all' || !payload.repeatRule) {
          if (payload.scope === 'all') await api.post(`/blocks/${payload.id}/delete`, { scope: 'all' });
          else await api.delete(`/blocks/${payload.id}`);
        } else {
          const dates =
            payload.scope === 'single'
              ? [payload.instanceDate]
              : collectRemovalDates(
                  payload.sourceDate ?? payload.instanceDate,
                  payload.repeatRule,
                  payload.instanceDate,
                  payload.exceptions,
                  payload.count ?? 1,
                );
          await api.post(`/blocks/${payload.id}/delete`, {
            scope: payload.scope,
            dates,
          });
        }
        setRevision((prev) => prev + 1);
      } catch (err) {
        console.error(err);
      }
    },
    [],
  );

  const deleteTask = useCallback(
    async (payload: DeleteRequest) => {
      if (!payload.id) return;
      try {
        if (payload.scope === 'all' || !payload.repeatRule) {
          if (payload.scope === 'all') await api.post(`/tasks/${payload.id}/delete`, { scope: 'all' });
          else await api.delete(`/tasks/${payload.id}`);
        } else {
          const dates =
            payload.scope === 'single'
              ? [payload.instanceDate]
              : collectRemovalDates(
                  payload.sourceDate ?? payload.instanceDate,
                  payload.repeatRule,
                  payload.instanceDate,
                  payload.exceptions,
                  payload.count ?? 1,
                );
          await api.post(`/tasks/${payload.id}/delete`, {
            scope: payload.scope,
            dates,
          });
        }
        setRevision((prev) => prev + 1);
      } catch (err) {
        console.error(err);
      }
    },
    [],
  );

  const deleteAllBlocks = useCallback(
    async (dateKey: string) => {
      try {
        await api.delete(`/blocks/date/${dateKey}/all`);
        setRevision((prev) => prev + 1);
      } catch (err) {
        console.error('Error eliminando todos los bloques:', err);
        throw err;
      }
    },
    [],
  );

  const deleteAllTasks = useCallback(
    async (dateKey: string) => {
      try {
        await api.delete(`/tasks/date/${dateKey}/all`);
        setRevision((prev) => prev + 1);
      } catch (err) {
        console.error('Error eliminando todas las tareas:', err);
        throw err;
      }
    },
    [],
  );

  const completeItem = useCallback(
    async (payload: CompletionPayload) => {
      try {
        const response = await api.post('/completions', payload);
        const saved: CompletionFeedback = response.data?.item;
        if (!saved) return null;
        setCompletionsMap((prev) => {
          const list = prev[saved.instanceDate] ?? [];
          const filtered = list.filter(
            (entry) =>
              entry.id !== saved.id &&
              (saved.taskId ? entry.taskId !== saved.taskId : true) &&
              (saved.blockId ? entry.blockId !== saved.blockId : true),
          );
          return { ...prev, [saved.instanceDate]: [...filtered, saved] };
        });
        if (saved.taskId) {
          setTasksMap((prev) => {
            const next = { ...prev };
            const items = next[saved.instanceDate];
            if (items) {
              next[saved.instanceDate] = items.map((task) =>
                task.id === saved.taskId ? { ...task, done: true } : task,
              );
            }
            return next;
          });
        }
        if (saved.blockId) {
          setBlocksMap((prev) => {
            const next = { ...prev };
            const items = next[saved.instanceDate];
            if (items) {
              next[saved.instanceDate] = items.map((block) =>
                block.id === saved.blockId ? { ...block, completed: true } : block,
              );
            }
            return next;
          });
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('agendo:completion-saved', { detail: saved }));
        }
        return saved;
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    [],
  );

  if (!hydrated) {
    return (
      <main className="calendar-stage" style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
        <div className="calendar-stage__bg" />
        <section className="calendar-hero">
          <p className="mt-4 text-center text-sm text-white/70">Cargando calendario...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="calendar-stage" style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      <div className="calendar-stage__bg" />
      <section className="calendar-hero">
        <div style={{ overflowX: 'auto', width: '100%', paddingBottom: '8px' }}>
          <div style={{ minWidth: '320px' }}>
            <CalendarMonth
              monthLabel={monthLabel}
              weeks={weeks}
              selectedDay={selectedDay}
              onPrevMonth={onPrevMonth}
              onNextMonth={onNextMonth}
              onSelectDay={(day) => setSelectedDate(day.date)}
              anim={direction}
            />
          </div>
        </div>
        {rangeError && <p className="mt-4 text-center text-sm text-red-200 px-2">{rangeError}</p>}
      </section>
      <DayOverlay
        day={selectedDay}
        onClose={() => setSelectedDate(null)}
        onAddBlock={addBlock}
        onUpdateBlock={updateBlock}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        onUpdateNote={updateNote}
        onResetTags={resetTags}
        onGenerateTag={generateTag}
        onDeleteBlock={deleteBlock}
        onDeleteTask={deleteTask}
        onDeleteAllBlocks={deleteAllBlocks}
        onDeleteAllTasks={deleteAllTasks}
        onCheckInSaved={() => setRevision((prev) => prev + 1)}
        onCompleteItem={completeItem}
      />
    </main>
  );
}

function buildMonth(
  base: Date,
  checkIns: CheckInMap,
  blocks: BlockMap,
  tasks: TaskMap,
  stateMap: DayStateMap,
  completions: CompletionMap,
): Day[][] {
  const { start } = visibleRange(base);
  const matrix: Day[][] = [];
  for (let week = 0; week < 6; week++) {
    const row: Day[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const current = new Date(start);
      current.setDate(start.getDate() + week * 7 + dayIndex);
      row.push(buildDay(current, base, checkIns, blocks, tasks, stateMap, completions));
    }
    matrix.push(row);
  }
  return matrix;
}

function buildDay(
  current: Date,
  base: Date,
  checkIns: CheckInMap,
  blocks: BlockMap,
  tasks: TaskMap,
  stateMap: DayStateMap,
  completions: CompletionMap,
): Day {
  const todayStart = startOfDay(new Date());
  const dayStart = startOfDay(current);
  const diff = dayStart.getTime() - todayStart.getTime();
  const key = formatDateKey(current);
  const checkIn = checkIns[key];
  const completionsForDay = completions[key] ?? [];
  const blockItems = blocks[key] ?? [];
  const taskItems = tasks[key] ?? [];
  const dayState = stateMap[key];
  const hasCheckIn = Boolean(checkIn);
  const isToday = diff === 0;
  const isFuture = diff > 0;
  const isPast = diff < 0;

  let state: DayState;
  if (isToday) state = 'today';
  else if (diff < 0) state = hasCheckIn ? 'past-checkin' : 'past-no-checkin';
  else state = hasCheckIn ? 'future-checkin' : 'future-empty';

  const hasActivity =
    blockItems.length > 0 || taskItems.length > 0 || ((dayState?.tags?.length ?? 0) > 0 && diff <= 0);
  const detail = buildDayDetail(
    current,
    state,
    blockItems,
    taskItems,
    hasCheckIn,
    checkIn,
    dayState,
    completionsForDay,
  );
  const summary = buildDaySummary({
    hasCheckIn,
    isToday,
    blocksCount: blockItems.length,
    tasksCount: taskItems.length,
    pendingBlocks: detail.pendingBlocks,
    pendingTasks: detail.pendingTasks,
    dayNote: dayState?.note ?? null,
    hasInsights: Boolean(detail.insights?.length),
  });
  return {
    date: current,
    inMonth: current.getMonth() === base.getMonth(),
    isToday,
    isFuture,
    hasActivity,
    hasCheckIn,
    state,
    summary,
    indicators: buildIndicators(summary, { isFuture, isToday, isPast }),
    detail,
  };
}

function buildDayDetail(
  date: Date,
  state: DayState,
  blockItems: BlockItem[],
  taskItems: TaskItem[],
  hasCheckIn: boolean,
  checkIn?: CheckInItem,
  dayState?: DayStateRecord,
  completionsForDay: CompletionFeedback[] = [],
): Day['detail'] {
  let pendingBlocks = 0;
  const blocks: DayBlock[] = blockItems.map((block) => {
    const completion = completionsForDay.find((entry) => entry.blockId === block.id) ?? null;
    const completed = Boolean(block.completed) || Boolean(completion);
    if (!completed) pendingBlocks += 1;
    return {
      id: block.id,
      title: block.title,
      time: `${block.start} - ${block.end}`,
      accent: (block.color === 'turquoise' ? 'turquoise' : 'violet') as AccentTone,
      instanceDate: formatDateKey(date),
      repeatRule: block.repeatRule,
      repeatExceptions: block.repeatExceptions ?? [],
      sourceDate: block.sourceDate ?? block.date,
      completed,
      completionFeedback: completion,
      notifications: block.notifications ?? null,
    };
  });

  let pendingTasks = 0;
  const tasks: DayTask[] = taskItems.map((task) => {
    const completion = completionsForDay.find((entry) => entry.taskId === task.id) ?? null;
    const done = task.done || Boolean(completion);
    if (!done) pendingTasks += 1;
    return {
      id: task.id,
      title: task.title,
      accent: (task.priority === 'alta' ? 'turquoise' : 'violet') as AccentTone,
      done,
      instanceDate: formatDateKey(date),
      repeatRule: task.repeatRule,
      repeatExceptions: task.repeatExceptions ?? [],
      sourceDate: task.sourceDate ?? task.date,
      completionFeedback: completion,
      notifications: task.notifications ?? null,
    };
  });

  const tags =
    (dayState?.tags as DayTagEntry[] | undefined)?.map((tag) => ({ label: tag.label, tone: tag.tone })) ??
    buildFallbackTags(date, blockItems.length > 0, hasCheckIn);

  const note =
    (dayState?.note && dayState.note.trim().length > 0
      ? dayState.note
      : checkIn
        ? buildCheckInNote(checkIn)
        : summaryCopy(state)) ?? '';

  const insights = checkIn ? buildCheckInInsights(checkIn) : undefined;

  return {
    summary: checkIn ? summarizeCheckIn(checkIn) : summaryCopy(state),
    blocks,
    tasks,
    note,
    tags,
    insights,
    pendingBlocks,
    pendingTasks,
  };
}

function buildFallbackTags(date: Date, hasActivity: boolean, hasCheckIn: boolean) {
  const palette: DayTagEntry[] = [
    { label: 'Flow', tone: 'violet' },
    { label: 'Energia alta', tone: 'turquoise' },
    { label: 'Mindful', tone: 'neutral' },
    { label: 'Insight', tone: 'turquoise' },
  ];
  const tags = [palette[date.getDate() % palette.length]];
  if (hasActivity) tags.push(palette[0]);
  if (hasCheckIn) tags.push(palette[3]);
  return tags.slice(0, 3);
}

function summaryCopy(state: DayState) {
  switch (state) {
    case 'past-checkin':
      return 'Dia registrado: foco suave + insight disponible.';
    case 'past-no-checkin':
      return 'Sin check-in. Los datos esperan confirmacion.';
    case 'future-checkin':
      return 'Registro adelantado para mantener consistencia.';
    case 'future-empty':
      return 'Planifica rapido sin perder aire ni claridad.';
    default:
      return 'Organiza bloques, tareas y energia de HOY.';
  }
}

function buildDaySummary({
  hasCheckIn,
  isToday,
  blocksCount,
  tasksCount,
  pendingBlocks,
  pendingTasks,
  dayNote,
  hasInsights,
}: {
  hasCheckIn: boolean;
  isToday: boolean;
  blocksCount: number;
  tasksCount: number;
  pendingBlocks: number;
  pendingTasks: number;
  dayNote?: string | null;
  hasInsights: boolean;
}): Day['summary'] {
  const note = (dayNote ?? '').trim();
  return {
    checkinStatus: hasCheckIn ? 'done' : isToday ? 'pending' : 'none',
    blocksCount,
    tasksCount,
    pendingBlocks,
    pendingTasks,
    hasNote: note.length > 0,
    hasInsights,
  };
}

function buildIndicators(
  summary: Day['summary'],
  context: { isFuture: boolean; isToday: boolean; isPast: boolean },
): Day['indicators'] {
  const indicators: Day['indicators'] = [];
  const hasReflection = summary.hasNote || summary.hasInsights;
  const checkinLabel =
    summary.checkinStatus === 'done'
      ? 'registrado'
      : summary.checkinStatus === 'pending'
        ? 'pendiente'
        : context.isFuture
          ? 'todavia no ocurre'
          : 'sin registrar';

  const checkinVariant = context.isPast && summary.checkinStatus === 'none' ? 'ring' : undefined;
  const checkinState: Day['indicators'][number]['state'] =
    summary.checkinStatus === 'done'
      ? 'on'
      : summary.checkinStatus === 'pending'
        ? 'medium'
        : context.isFuture
          ? 'subtle'
          : 'off';

  indicators.push({
    type: 'checkin',
    tone: 'checkin',
    label: 'Check-in diario',
    tooltip: `Check-in de este dia: ${checkinLabel}`,
    state: checkinState,
    isReminding: summary.checkinStatus === 'pending' && context.isToday,
    variant: checkinVariant,
  });

  const planningCount = summary.blocksCount + summary.tasksCount;
  const hasPlanning = planningCount > 0;
  let activityState: Day['indicators'][number]['state'];
  if (hasPlanning) {
    activityState = 'on';
  } else if (hasReflection) {
    activityState = context.isFuture ? 'subtle' : 'medium';
  } else {
    activityState = context.isFuture ? 'subtle' : 'off';
  }

  const activityTooltipParts: string[] = [];
  if (summary.blocksCount > 0) activityTooltipParts.push(`Bloques: ${summary.blocksCount}`);
  if (summary.tasksCount > 0) activityTooltipParts.push(`Tareas: ${summary.tasksCount}`);
  if (hasReflection) activityTooltipParts.push('Notas o insights presentes');

  indicators.push({
    type: 'activity',
    tone: 'activity',
    label: 'Agenda y notas',
    tooltip: activityTooltipParts.length ? activityTooltipParts.join(' · ') : 'Sin planificacion ni notas',
    state: activityState,
  });

  return indicators;
}

function summarizeCheckIn(checkIn: CheckInItem) {
  const parts = ['Check-in registrado'];
  if (checkIn.mood) parts.push(`humor ${moodLabel(checkIn.mood)}`);
  if (typeof checkIn.energyLevel === 'number') parts.push(`energia ${checkIn.energyLevel}/5`);
  if (checkIn.focus) parts.push(`foco ${focusLabel(checkIn.focus)}`);
  return parts.join(' - ');
}

function buildCheckInNote(checkIn: CheckInItem) {
  const parts: string[] = [];
  if (typeof checkIn.sleepDuration === 'number') parts.push(`Sueno ${formatHours(checkIn.sleepDuration)}`);
  if (typeof checkIn.sleepQuality === 'number') parts.push(`Calidad ${checkIn.sleepQuality}/5`);
  if (typeof checkIn.energyLevel === 'number') parts.push(`Energia ${checkIn.energyLevel}/5`);
  if (checkIn.stress) parts.push(`Estres ${stressLabel(checkIn.stress)}`);
  if (checkIn.focus) parts.push(`Foco ${focusLabel(checkIn.focus)}`);
  return parts.join(' - ') || 'Check-in guardado sin detalles adicionales.';
}

function buildCheckInInsights(checkIn: CheckInItem) {
  const list: { label: string; tone: 'positive' | 'neutral' }[] = [];
  if (typeof checkIn.energyLevel === 'number') {
    list.push({
      label: `Energia ${checkIn.energyLevel}/5`,
      tone: checkIn.energyLevel >= 4 ? 'positive' : 'neutral',
    });
  }
  if (typeof checkIn.sleepDuration === 'number') {
    list.push({ label: `Sueno ${formatHours(checkIn.sleepDuration)}`, tone: 'neutral' });
  }
  if (checkIn.mood) {
    list.push({
      label: `Humor ${moodLabel(checkIn.mood)}`,
      tone: checkIn.mood === 'EXCELLENT' ? 'positive' : 'neutral',
    });
  }
  if (checkIn.stress) {
    list.push({
      label: `Estres ${stressLabel(checkIn.stress)}`,
      tone: checkIn.stress === 'LOW' ? 'positive' : 'neutral',
    });
  }
  if (checkIn.focus) {
    list.push({
      label: `Foco ${focusLabel(checkIn.focus)}`,
      tone: 'neutral',
    });
  }
  return list.length ? list : undefined;
}

function buildAutoTag(
  checkIn?: CheckInItem,
  tasks?: TaskItem[],
  blocks?: BlockItem[],
): DayTagEntry {
  if (checkIn?.energyLevel && checkIn.energyLevel >= 4) {
    return { label: 'Dia de alta energia', tone: 'turquoise' };
  }
  if (tasks && tasks.filter((t) => t.done).length >= 3) {
    return { label: 'Momentum productivo', tone: 'violet' };
  }
  if (blocks && blocks.length >= 3) {
    return { label: 'Agenda cargada', tone: 'violet' };
  }
  if (checkIn?.mood === 'LOW') {
    return { label: 'Recordar autocuidado', tone: 'neutral' };
  }
  return { label: 'Insight rapido', tone: 'neutral' };
}

function formatHours(hours: number) {
  const whole = Math.trunc(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes <= 0) return `${whole}h`;
  return `${whole}h ${minutes}m`;
}

function visibleRange(base: Date) {
  const firstInMonth = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = new Date(firstInMonth);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  return { start, end };
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function capitalize(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function moodLabel(code: string) {
  const labels: Record<string, string> = {
    LOW: 'bajo',
    NEUTRAL: 'neutral',
    GOOD: 'bueno',
    EXCELLENT: 'excelente',
  };
  return labels[code] ?? code.toLowerCase();
}

function stressLabel(code: string) {
  const labels: Record<string, string> = {
    LOW: 'bajo',
    MEDIUM: 'medio',
    HIGH: 'alto',
  };
  return labels[code] ?? code.toLowerCase();
}

function focusLabel(code: string) {
  const labels: Record<string, string> = {
    ESTUDIO: 'Estudio',
    TRABAJO: 'Trabajo',
    SALUD: 'Salud',
    DESCANSO: 'Descanso',
    CREATIVIDAD: 'Creatividad',
    PROYECTO: 'Proyecto',
    ORDEN: 'Orden',
    SOCIAL: 'Social',
  };
  return labels[code] ?? code;
}

function mapCheckIns(items: CheckInItem[]): CheckInMap {
  const map: CheckInMap = {};
  for (const item of items) map[item.date] = item;
  return map;
}

function expandItems<
  T extends { date: string; repeatRule?: RepeatRule | null; repeatExceptions?: string[] | null; sourceDate?: string },
>(
  items: T[],
  rangeStart: Date,
  rangeEnd: Date,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  const withSource = items.map((item) => ({ ...item, sourceDate: item.sourceDate ?? item.date }));
  for (const item of withSource) {
    const targets = computeOccurrences(item.date, item.repeatRule ?? null, rangeStart, rangeEnd, item.repeatExceptions);
    for (const dateKey of targets) {
      if (!result[dateKey]) result[dateKey] = [];
      result[dateKey].push({ ...item, date: dateKey, sourceDate: item.sourceDate });
    }
  }
  return result;
}

function mapDayState(items: any[]): DayStateMap {
  return items.reduce<DayStateMap>((acc, item) => {
    acc[item.date] = {
      note: item.note ?? null,
      tags: (item.tags as DayTagEntry[] | undefined) ?? [],
    };
    return acc;
  }, {});
}

function mapCompletions(items: CompletionFeedback[]): CompletionMap {
  return items.reduce<CompletionMap>((acc, item) => {
    const key = item.instanceDate;
    if (!acc[key]) acc[key] = [];
    acc[key] = [...acc[key], item];
    return acc;
  }, {});
}

function computeOccurrences(
  baseDateString: string,
  rule: RepeatRule | null,
  rangeStart: Date,
  rangeEnd: Date,
  exceptions?: string[] | null,
): string[] {
  const occurrences: string[] = [];
  const baseDate = parseDate(baseDateString);
  if (!rule) {
    const key = formatDateKey(baseDate);
    if (isWithinRange(baseDate, rangeStart, rangeEnd) && !isException(key, exceptions)) occurrences.push(key);
    return occurrences;
  }
  const endRule = rule.endDate ? parseDate(rule.endDate) : null;
  const limit = typeof rule.count === 'number' ? Math.max(1, rule.count) : Infinity;
  let added = 0;
  for (let time = startOfDay(rangeStart).getTime(); time <= startOfDay(rangeEnd).getTime(); time += 86400000) {
    const current = new Date(time);
    if (current < baseDate) continue;
    if (endRule && current > endRule) continue;
    const diffDays = Math.floor((current.getTime() - baseDate.getTime()) / 86400000);
    if (diffDays < 0) continue;
    let matches = false;
    switch (rule.kind) {
      case 'daily':
      case 'custom': {
        const interval = Math.max(1, rule.interval || 1);
        if (diffDays % interval === 0) matches = true;
        break;
      }
      case 'weekly': {
        const interval = Math.max(1, rule.interval || 1);
        const allowedDays = rule.daysOfWeek && rule.daysOfWeek.length ? rule.daysOfWeek : [baseDate.getDay()];
        if (!allowedDays.includes(current.getDay())) break;
        const weeks = Math.floor(diffDays / 7);
        if (weeks % interval === 0) matches = true;
        break;
      }
    }
    const key = formatDateKey(current);
    if (matches && !isException(key, exceptions)) {
      occurrences.push(key);
      added += 1;
      if (added >= limit) break;
    }
  }
  return occurrences;
}

function parseDate(key: string) {
  const [y, m, d] = key.split('-').map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

function isWithinRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= startOfDay(start).getTime() && date.getTime() <= startOfDay(end).getTime();
}

function isException(dateKey: string, exceptions?: string[] | null) {
  return (exceptions ?? []).includes(dateKey);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function collectRemovalDates(
  baseDateKey: string,
  rule: RepeatRule | null | undefined,
  startKey: string,
  exceptions: string[] | null | undefined,
  count: number,
) {
  if (!rule) return [startKey];
  const start = parseDate(startKey);
  const horizonMultiplier = rule.kind === 'weekly' ? 8 * Math.max(1, rule.interval || 1) : 4 * Math.max(1, rule.interval || 1);
  const horizon = addDays(start, count * horizonMultiplier + 30);
  const occurrences = computeOccurrences(baseDateKey, rule, start, horizon, exceptions);
  const filtered = occurrences.filter((date) => date >= startKey);
  return filtered.slice(0, Math.max(1, count));
}
