export type CompletionFeeling = 'excellent' | 'good' | 'neutral' | 'tired' | 'frustrated';
export type FocusState = 'yes' | 'partial' | 'no';
export type InterruptionReason = 'notifications' | 'people' | 'fatigue' | 'self' | 'other';
export type TimeDelta = 'more' | 'equal' | 'less';

export type CompletionFeedback = {
  id?: string;
  taskId?: string | null;
  blockId?: string | null;
  instanceDate: string;
  completedAt: string;
  feeling: CompletionFeeling;
  focus: FocusState;
  interrupted: boolean;
  interruptionReason?: InterruptionReason | null;
  timeDelta: TimeDelta;
  note?: string | null;
};

export type CompletionPayload = Omit<CompletionFeedback, 'id' | 'completedAt'>;
