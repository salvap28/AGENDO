'use client';

import { AnimatePresence, LayoutGroup, motion, type Transition } from 'framer-motion';
import clsx from 'clsx';
import Chevron from '@/components/icons/Chevron';
import type { CompletionFeedback } from '@/types/completion';

export type AccentTone = 'violet' | 'turquoise';

export type DayState = 'today' | 'past-checkin' | 'past-no-checkin' | 'future-checkin' | 'future-empty';

export type DayBlock = {
  id?: string;
  title: string;
  time: string;
  accent: AccentTone;
  instanceDate?: string;
  repeatRule?: any;
  repeatExceptions?: string[];
  sourceDate?: string;
  completed?: boolean;
  completionFeedback?: CompletionFeedback | null;
  notifications?: { minutesBefore: number }[] | null;
};

export type DayTask = {
  id?: string;
  title: string;
  accent?: AccentTone;
  done?: boolean;
  instanceDate?: string;
  repeatRule?: any;
  repeatExceptions?: string[];
  sourceDate?: string;
  completionFeedback?: CompletionFeedback | null;
  notifications?: { minutesBefore: number }[] | null;
};

export type DayTag = {
  label: string;
  tone: AccentTone | 'neutral';
};

export type DayInsight = {
  label: string;
  tone: 'positive' | 'neutral';
};

export type DayDetail = {
  summary: string;
  blocks: DayBlock[];
  tasks: DayTask[];
  note?: string;
  tags: DayTag[];
  insights?: DayInsight[];
  pendingBlocks: number;
  pendingTasks: number;
};

export type CheckInStatus = 'none' | 'pending' | 'done';

export type DaySummary = {
  checkinStatus: CheckInStatus;
  blocksCount: number;
  tasksCount: number;
  pendingBlocks: number;
  pendingTasks: number;
  hasNote: boolean;
  hasInsights: boolean;
};

export type IndicatorState = 'off' | 'subtle' | 'medium' | 'on';

export type DayIndicator = {
  type: 'checkin' | 'activity';
  tone: 'checkin' | 'activity';
  label: string;
  tooltip?: string;
  state: IndicatorState;
  isReminding?: boolean;
  variant?: 'ring';
};

export type DayIndicators = DayIndicator[];

export type Day = {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  hasActivity: boolean;
  hasCheckIn: boolean;
  state: DayState;
  summary: DaySummary;
  indicators: DayIndicators;
  detail: DayDetail;
};

type CalendarMonthProps = {
  monthLabel: string;
  weeks: Day[][];
  selectedDay: Day | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: Day) => void;
  anim?: 'enter-left' | 'enter-right' | null;
};

const WEEKDAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];

export default function CalendarMonth({
  monthLabel,
  weeks,
  selectedDay,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  anim = null,
}: CalendarMonthProps) {
  const transition: Transition = { duration: 0.26, ease: [0.33, 1, 0.68, 1] };
  const offset = anim ? (anim === 'enter-left' ? -32 : 32) : 0;
  const initial = anim ? { opacity: 0, x: offset } : { opacity: 0, y: 14 };

  return (
    <section className="calendar-lens">
      <div className="calendar-lens__ambient" aria-hidden />
      <div className="calendar-lens__inner">
        <div className="calendar-header">
          <motion.span layoutId="month-halo" className="calendar-halo" />
          <div className="calendar-header__row">
            <ArrowButton ariaLabel="Mes anterior" onClick={onPrevMonth} dir="left" />
            <div className="flex flex-col items-center gap-2 text-center">
              <motion.h2
                key={monthLabel}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.33, 0, 0.2, 1] }}
                className="calendar-title"
              >
                {monthLabel}
              </motion.h2>
              <span className="calendar-subtitle">Calendario</span>
            </div>
            <ArrowButton ariaLabel="Mes siguiente" onClick={onNextMonth} />
          </div>
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>

        <div className="relative">
          <AnimatePresence mode="wait" initial={false} custom={anim}>
            <motion.div
              key={monthLabel}
              className="relative"
              initial={initial}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{
                opacity: 0,
                x: anim === 'enter-left' ? 32 : -32,
              }}
              transition={transition}
            >
              <LayoutGroup id="agendo-calendar-grid">
                <div className="calendar-grid">
                  {weeks.flat().map((day) => (
                    <DayCell
                      key={day.date.toISOString()}
                      day={day}
                      isSelected={selectedDay ? sameDate(day.date, selectedDay.date) : false}
                      onSelect={() => onSelectDay(day)}
                    />
                  ))}
                </div>
              </LayoutGroup>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function DayCell({ day, isSelected, onSelect }: { day: Day; isSelected: boolean; onSelect: () => void }) {
  const readableDate = day.date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const srLabel = [readableDate, dayStateDescription(day)].filter(Boolean).join('. ');
  const weekdayShort = day.date
    .toLocaleDateString('es-AR', { weekday: 'short' })
    ?.replace('.', '')
    ?.toUpperCase();
  const dayClass = clsx(
    'calendar-day',
    !day.inMonth && 'calendar-day--out',
    day.isFuture && 'calendar-day--future',
    day.state === 'past-no-checkin' && 'calendar-day--dim',
    day.hasCheckIn && 'calendar-day--checkin',
    day.isToday && 'calendar-day--today',
    isSelected && 'is-selected',
  );

  const dayId = day.isToday ? 'tutorial-day-target' : undefined;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      animate={{ scale: isSelected ? 1.03 : 1 }}
      whileTap={{ scale: 0.95 }}
      whileHover={day.inMonth ? { scale: 1.02 } : undefined}
      className={dayClass}
      id={dayId}
    >
      <span className="sr-only">{srLabel}</span>
      <div className="calendar-day__surface">
        <span className="calendar-day__weekday" aria-hidden="true">
          {weekdayShort}
        </span>
        <span className="calendar-day__date" aria-hidden="true">
          {day.date.getDate()}
        </span>
        <DayIndicator
          hasCheckIn={day.hasCheckIn}
          hasTasksOrBlocks={(day.detail.pendingTasks ?? 0) + (day.detail.pendingBlocks ?? 0) > 0}
          isToday={day.isToday}
          isSelected={isSelected}
        />
      </div>
    </motion.button>
  );
}

type DayIndicatorProps = {
  hasCheckIn: boolean;
  hasTasksOrBlocks: boolean;
  isToday?: boolean;
  isSelected?: boolean;
};

function DayIndicator({ hasCheckIn, hasTasksOrBlocks, isToday, isSelected }: DayIndicatorProps) {
  const leftOn = hasCheckIn;
  const rightOn = hasTasksOrBlocks;
  const anyOn = leftOn || rightOn;

  const style = {
    ['--indicator-left' as string]: leftOn ? 'rgba(94,234,212,0.92)' : 'rgba(180,175,205,0.08)',
    ['--indicator-right' as string]: rightOn ? 'rgba(192,132,252,0.9)' : 'rgba(180,175,205,0.12)',
    ['--indicator-glow-left' as string]: leftOn ? 'rgba(94,234,212,0.6)' : 'transparent',
    ['--indicator-glow-right' as string]: rightOn ? 'rgba(192,132,252,0.42)' : 'transparent',
    ['--indicator-thickness' as string]: leftOn || rightOn ? '1.5px' : '1.05px',
  } as React.CSSProperties;

  return (
    <motion.span
      layout
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className={clsx(
        'day-mini-indicator',
        anyOn && 'is-on',
        leftOn && 'has-checkin',
        rightOn && 'has-activity',
        isToday && 'is-today',
        isSelected && 'is-selected',
      )}
      aria-hidden="true"
      style={style}
    />
  );
}

function ArrowButton({
  ariaLabel,
  onClick,
  dir = 'right',
}: {
  ariaLabel: string;
  onClick: () => void;
  dir?: 'left' | 'right';
}) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      className="calendar-nav-btn"
      onClick={onClick}
    >
      <Chevron dir={dir} />
    </motion.button>
  );
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayStateDescription(day: Day) {
  if (day.isToday) return 'Dia actual seleccionado';
  if (!day.inMonth) return 'Dia fuera del mes visible';
  switch (day.state) {
    case 'past-checkin':
      return 'Dia con check-in registrado';
    case 'past-no-checkin':
      return 'Dia sin check-in';
    case 'future-checkin':
      return 'Dia futuro ya registrado';
    case 'future-empty':
      return 'Dia futuro aun sin registrar';
    default:
      return 'Dia disponible';
  }
}


